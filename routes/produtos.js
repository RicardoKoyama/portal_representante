const express = require('express');
const auth = require('../middlewares/auth');
const db = require('../db');
const multer = require('multer');
const upload = multer({ dest: 'tmp/' });
const { importarCSV } = require('../services/importaTabelaPreco');
const fs = require('fs');

const router = express.Router();

router.get('/produtos', auth, (req, res) => {

  const sqlTabelas = `
    SELECT
      tp.id,
      tp.codigo,
      COUNT(pp.codigo_produto) AS total_produtos,
      MAX(pp.atualizado_em) AS ultima_atualizacao
    FROM tabelas_preco tp
    LEFT JOIN produtos_preco pp
      ON pp.tabela_preco_id = tp.id
    GROUP BY tp.id, tp.codigo
    ORDER BY tp.codigo
  `;

  db.all(sqlTabelas, [], (err, tabelas) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao carregar tabelas.');
    }

    res.render('painel/produtos', {
      tabelas
    });
  });
});

router.get('/produtos/:id', auth, (req, res) => {
  const tabelaId = req.params.id;

  const sqlTabela = `
    SELECT id, codigo
    FROM tabelas_preco
    WHERE id = ?
  `;

  const sqlProdutos = `
    SELECT
      codigo_produto,
      preco_m2,
      preco_m2_palete,
      atualizado_em
    FROM produtos_preco
    WHERE tabela_preco_id = ?
    ORDER BY codigo_produto
  `;

  db.get(sqlTabela, [tabelaId], (err, tabela) => {
    if (err || !tabela) {
      return res.status(404).send('Tabela não encontrada.');
    }

    db.all(sqlProdutos, [tabelaId], (err2, produtos) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send('Erro ao carregar produtos.');
      }

      res.render('painel/produtos_tabela', {
        tabela,
        produtos
      });
    });
  });
});

router.get('/produtos/:id/upload', auth, (req, res) => {
  const tabelaId = req.params.id;

  db.get(
    'SELECT id, codigo FROM tabelas_preco WHERE id = ?',
    [tabelaId],
    (err, tabela) => {
      if (!tabela) {
        return res.status(404).send('Tabela não encontrada.');
      }

      res.render('painel/produtos_upload', { tabela });
    }
  );
});

router.post(
  '/produtos/:id/upload',
  auth,
  upload.single('arquivo'),
  async (req, res) => {
    const tabelaId = req.params.id;

    if (!req.file) {
      return res.send('Nenhum arquivo enviado.');
    }

    try {
      const total = await importarCSV(tabelaId, req.file.path);

      fs.unlinkSync(req.file.path);

      console.log(`Importados ${total} registros na tabela ${tabelaId}`);

      res.redirect(`/produtos/${tabelaId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Erro ao importar CSV.');
    }
  }
);

module.exports = router;
