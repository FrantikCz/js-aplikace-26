const { db } = require('../db/sequelize');

class PostController {
  // Liste všechny příspěvky
  static async index(req, res) {
    try {
      const posts = await db.Post.findAll({
        include: [{ model: db.Comment, attributes: ['id'] }],
        order: [['createdAt', 'DESC']]
      });
      res.render('posts/index', { posts });
    } catch (error) {
      console.error(error);
      res.status(500).send('Chyba při načítání příspěvků');
    }
  }

  // Zobrazí formulář pro vytvoření nového příspěvku
  static async create(req, res) {
    res.render('posts/form', { post: null, isEdit: false });
  }

  // Uloží nový příspěvek
  static async store(req, res) {
    try {
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).render('posts/form', {
          post: { title, content },
          isEdit: false,
          error: 'Název a obsah jsou povinné!'
        });
      }

      await db.Post.create({
        title,
        content,
        author: req.currentUser.username,
        userId: req.currentUser.id
      });

      res.redirect('/posts');
    } catch (error) {
      console.error(error);
      res.status(500).render('posts/form', {
        post: req.body,
        isEdit: false,
        error: 'Chyba při vytváření příspěvku'
      });
    }
  }

  // Zobrazí detail jednoho příspěvku
  static async show(req, res) {
    try {
      const post = await db.Post.findByPk(req.params.id, {
        include: [db.Comment]
      });
      if (!post) {
        return res.status(404).send('Příspěvek nenalezen');
      }
      res.render('posts/show', { post });
    } catch (error) {
      console.error(error);
      res.status(500).send('Chyba při načítání příspěvku');
    }
  }

  // Zobrazí formulář pro editaci příspěvku
  static async edit(req, res) {
    try {
      const post = await db.Post.findByPk(req.params.id);
      if (!post) {
        return res.status(404).send('Příspěvek nenalezen');
      }
      if (post.userId !== req.currentUser.id) {
        return res.status(403).send('Tento příspěvek nemůžete upravit.');
      }
      res.render('posts/form', { post, isEdit: true });
    } catch (error) {
      console.error(error);
      res.status(500).send('Chyba při načítání příspěvku');
    }
  }

  // Aktualizuje příspěvek
  static async update(req, res) {
    try {
      const post = await db.Post.findByPk(req.params.id);
      if (!post) {
        return res.status(404).send('Příspěvek nenalezen');
      }
      if (post.userId !== req.currentUser.id) {
        return res.status(403).send('Tento příspěvek nemůžete upravit.');
      }

      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).render('posts/form', {
          post: { id: post.id, title, content, author: post.author },
          isEdit: true,
          error: 'Název a obsah jsou povinné!'
        });
      }

      await post.update({
        title,
        content,
        author: req.currentUser.username
      });

      res.redirect(`/posts/${post.id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Chyba při aktualizaci příspěvku');
    }
  }

  // Odstraní příspěvek
  static async destroy(req, res) {
    try {
      const post = await db.Post.findByPk(req.params.id);
      if (!post) {
        return res.status(404).send('Příspěvek nenalezen');
      }
      if (post.userId !== req.currentUser.id) {
        return res.status(403).send('Tento příspěvek nemůžete smazat.');
      }

      await post.destroy();
      res.redirect('/posts');
    } catch (error) {
      console.error(error);
      res.status(500).send('Chyba při mazání příspěvku');
    }
  }
}

module.exports = PostController;
