const express = require('express');
const auth = require('../middlewares/auth');
const db = require('../db');

const router = express.Router();

router.get('/dashboard', auth, (req, res) => {
  res.render('painel/dashboard', {
    nome: req.session.representante.nome
  });
});

module.exports = router;
