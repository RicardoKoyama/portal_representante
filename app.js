require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.set('trust proxy', 1);

app.use(session({
  name: 'portal_representante_sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,   
    sameSite: 'lax'
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/clientes'));
app.use('/', require('./routes/produtos'));

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Portal do representante rodando na porta ${PORT}`);
});
