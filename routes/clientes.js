const express = require('express');
const auth = require('../middlewares/auth');
const db = require('../db');

const router = express.Router();

router.get('/clientes', auth, (req, res) => {
  const representanteId = req.session.representante.id;

  const sql = `
    SELECT
        c.id,
        c.nome,
        c.plano,
        c.limite_telefones,
        c.ativo,
        tp.codigo AS tabela_codigo
    FROM clientes c
    LEFT JOIN tabelas_preco tp
    ON tp.id = c.tabela_preco_id
    WHERE c.representante_id = ?
    ORDER BY c.nome;

  `;

  db.all(sql, [representanteId], (err, rows) => {
    if (err) {
      console.error('Erro ao listar clientes:', err);
      return res.status(500).send('Erro ao carregar clientes.');
    }

    res.render('painel/clientes', {
      nomeRepresentante: req.session.representante.nome,
      clientes: rows || []
    });
  });
});

router.get('/clientes/:id', auth, (req, res) => {
  const representanteId = req.session.representante.id;
  const clienteId = req.params.id;

  const sqlCliente = `
    SELECT
      id,
      nome,
      plano,
      limite_telefones,
      validade_teste,
      ativo
    FROM clientes
    WHERE id = ?
      AND representante_id = ?
    LIMIT 1
  `;

  db.get(sqlCliente, [clienteId, representanteId], (err, cliente) => {
    if (err) {
      console.error('Erro ao buscar cliente:', err);
      return res.status(500).send('Erro ao carregar cliente.');
    }

    if (!cliente) {
      return res.status(404).send('Cliente não encontrado.');
    }

    const sqlUsuarios = `
        SELECT
            id,
            nome,
            telefone,
            email,
            validade,
            ativo
        FROM usuarios
        WHERE cliente_id = ?
        ORDER BY nome
        `;

        db.all(sqlUsuarios, [clienteId], (err2, usuarios) => {
        if (err2) {
            console.error('Erro ao buscar usuários:', err2);
            return res.status(500).send('Erro ao carregar usuários.');
        }

        const totalAtivos = usuarios.filter(u => u.ativo === 1).length;
        const vagasLivres = cliente.limite_telefones - totalAtivos;

        const hoje = new Date().toISOString().substring(0, 10);

        let situacaoValidade = 'Ativo';

        if (cliente.validade_teste) {
        if (cliente.validade_teste < hoje) {
            situacaoValidade = 'Vencido';
        } else {
            const diffDias =
            (new Date(cliente.validade_teste) - new Date()) / (1000 * 60 * 60 * 24);

            if (diffDias <= 5) {
            situacaoValidade = 'Próximo do vencimento';
            }
        }
        }

        res.render('painel/cliente_detalhe', {
            nomeRepresentante: req.session.representante.nome,
            cliente,
            usuarios,
            totalAtivos,
            vagasLivres,
            situacaoValidade
            });
        });
  });
});

router.post('/clientes/:clienteId/usuarios/:usuarioId/toggle', auth, (req, res) => {
  const representanteId = req.session.representante.id;
  const { clienteId, usuarioId } = req.params;

  const sql = `
    UPDATE usuarios
    SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END
    WHERE id = ?
      AND cliente_id = ?
      AND cliente_id IN (
        SELECT id FROM clientes WHERE representante_id = ?
      )
  `;

  db.run(sql, [usuarioId, clienteId, representanteId], function (err) {
    if (err) {
      console.error('Erro ao alterar status do usuário:', err);
      return res.status(500).send('Erro ao alterar usuário.');
    }

    res.redirect(`/clientes/${clienteId}`);
  });
});

router.get('/clientes/:id/usuarios/novo', auth, (req, res) => {
  res.render('usuario_novo', {
    clienteId: req.params.id
  });
});

router.post('/clientes/:id/usuarios/novo', auth, async (req, res) => {
  const clienteId = req.params.id;
  const { nome, telefone, email } = req.body;

  const cliente = await sqlGet(
    `SELECT limite_telefones FROM clientes WHERE id = ?`,
    [clienteId]
  );

  const count = await sqlGet(
    `SELECT COUNT(*) AS total FROM usuarios WHERE cliente_id = ? AND ativo = 1`,
    [clienteId]
  );

  if (count.total >= cliente.limite_telefones) {
    return res.send('Limite de usuários atingido.');
  }

  await cadastrarUsuario({
    nome,
    telefone,
    email,
    api: 'DELTA',
    dias: 15,
    ativo: 1,
    admin: 0,
    cliente_id: clienteId
  });

  res.redirect(`/clientes/${clienteId}`);
});

router.get('/clientes/:id/usuarios/novo', auth, (req, res) => {
  const clienteId = req.params.id;
  const representanteId = req.session.representante.id;

  const sql = `
    SELECT id, nome, limite_telefones
    FROM clientes
    WHERE id = ?
      AND representante_id = ?
  `;

  db.get(sql, [clienteId, representanteId], (err, cliente) => {
    if (!cliente) {
      return res.status(404).send('Cliente não encontrado.');
    }

    db.get(
      `SELECT COUNT(*) AS total FROM usuarios WHERE cliente_id = ? AND ativo = 1`,
      [clienteId],
      (err2, row) => {
        if (row.total >= cliente.limite_telefones) {
          return res.send('Limite de usuários atingido.');
        }

        res.render('painel/usuario_novo', { cliente });
      }
    );
  });
});

router.post('/clientes/:id/usuarios/novo', auth, (req, res) => {
  const clienteId = req.params.id;
  const representanteId = req.session.representante.id;
  const { nome, telefone, email } = req.body;

  db.get(
    `SELECT limite_telefones FROM clientes WHERE id = ? AND representante_id = ?`,
    [clienteId, representanteId],
    (err, cliente) => {
      if (!cliente) {
        return res.status(404).send('Cliente não encontrado.');
      }

      db.get(
        `SELECT COUNT(*) AS total FROM usuarios WHERE cliente_id = ? AND ativo = 1`,
        [clienteId],
        (err2, row) => {
          if (row.total >= cliente.limite_telefones) {
            return res.send(
              'Limite de usuários atingido. Entre em contato para upgrade.'
            );
          }

          const { cadastrarUsuario } = require('../services/usuariosService');

          cadastrarUsuario({
            nome,
            telefone,
            email,
            api: 'DELTA',
            dias: 15,
            ativo: 1,
            admin: 0,
            cliente_id: clienteId
          }).then(() => {
            res.redirect(`/clientes/${clienteId}`);
          }).catch(err3 => {
            console.error('Erro ao criar usuário:', err3);
            res.status(500).send('Erro ao criar usuário.');
          });
        }
      );
    }
  );
});

module.exports = router;
