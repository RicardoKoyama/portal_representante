module.exports = function authRepresentante(req, res, next) {
  if (!req.session.representante) {
    return res.redirect('/login');
  }
  next();
};
