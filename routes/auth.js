const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  console.log('LOGIN:', email, senha);

  db.get(
    'SELECT * FROM representantes WHERE email = ? AND ativo = 1',
    [email],
    async (err, rep) => {
      if (!rep) {
        return res.render('login', { erro: 'Login inválido' });
      }

      const ok = await bcrypt.compare(senha, rep.senha_hash);
      if (!ok) {
        return res.render('login', { erro: 'Login inválido' });
      }

      req.session.representante = {
        id: rep.id,
        nome: rep.nome
      };

      res.redirect('/dashboard');
    }
  );
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
