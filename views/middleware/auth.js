const { db } = require('../db/sequelize');

async function loadCurrentUser(req, res, next) {
  try {
    req.currentUser = req.session.userId
      ? await db.User.findByPk(req.session.userId)
      : null;
    res.locals.currentUser = req.currentUser;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.redirect('/auth/login');
  }

  next();
}

module.exports = { loadCurrentUser, requireAuth };
