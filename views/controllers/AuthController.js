const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const { db } = require('../db/sequelize');

function regenerateSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) {
        return reject(error);
      }
      req.session.userId = userId;
      req.session.save(saveError => saveError ? reject(saveError) : resolve());
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy(error => error ? reject(error) : resolve());
  });
}

class AuthController {
  static registerForm(req, res) {
    res.render('auth/register', { error: null, values: {} });
  }

  static async register(req, res) {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    const passwordConfirmation = req.body.passwordConfirmation || '';
    const values = { username };

    if (username.length < 3 || username.length > 50 || password.length < 8) {
      return res.status(400).render('auth/register', {
        error: 'Jméno musí mít 3 až 50 znaků a heslo alespoň 8 znaků.',
        values
      });
    }

    if (password !== passwordConfirmation) {
      return res.status(400).render('auth/register', {
        error: 'Hesla se neshodují.',
        values
      });
    }

    try {
      const existingUser = await db.User.findOne({
        where: { username }
      });
      if (existingUser) {
        return res.status(409).render('auth/register', {
          error: 'Toto uživatelské jméno už je použité.',
          values
        });
      }

      const user = await db.User.create({
        username,
        email: `user-${randomUUID()}@users.invalid`,
        passwordHash: await bcrypt.hash(password, 12)
      });

      await regenerateSession(req, user.id);
      res.redirect('/account');
    } catch (error) {
      console.error(error);
      res.status(500).render('auth/register', {
        error: 'Registraci se nepodařilo dokončit. Zkuste to znovu.',
        values
      });
    }
  }

  static loginForm(req, res) {
    res.render('auth/login', { error: null, username: '' });
  }

  static async login(req, res) {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    try {
      const user = await db.User.findOne({ where: { username } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).render('auth/login', {
          error: 'Nesprávné jméno nebo heslo.',
          username
        });
      }

      await regenerateSession(req, user.id);
      res.redirect('/account');
    } catch (error) {
      console.error(error);
      res.status(500).render('auth/login', {
        error: 'Přihlášení se nepodařilo. Zkuste to znovu.',
        username
      });
    }
  }

  static async logout(req, res, next) {
    try {
      await destroySession(req);
      res.clearCookie('connect.sid');
      res.redirect('/');
    } catch (error) {
      next(error);
    }
  }

  static account(req, res) {
    res.render('account', { user: req.currentUser, error: null });
  }

  static async deleteAccount(req, res, next) {
    const user = req.currentUser;

    try {
      if (!(await bcrypt.compare(req.body.password || '', user.passwordHash))) {
        return res.status(400).render('account', {
          user,
          error: 'Heslo není správné. Účet nebyl smazán.'
        });
      }

      await db.sequelize.transaction(async transaction => {
        const posts = await db.Post.findAll({
          where: { userId: user.id },
          attributes: ['id'],
          transaction
        });
        const postIds = posts.map(post => post.id);

        if (postIds.length) {
          await db.Comment.destroy({ where: { postId: postIds }, transaction });
        }
        await db.Comment.destroy({ where: { userId: user.id }, transaction });
        await db.Post.destroy({ where: { userId: user.id }, transaction });
        await user.destroy({ transaction });
      });

      await destroySession(req);
      res.clearCookie('connect.sid');
      res.redirect('/');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
