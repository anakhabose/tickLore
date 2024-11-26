const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
      return next();
  }
  // Optionally store the intended destination
  req.session.returnTo = req.originalUrl;
  res.redirect('/user/login');  // Redirect to login instead of signup
};

module.exports = { ensureAuthenticated };