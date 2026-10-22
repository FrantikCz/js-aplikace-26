const { db } = require('../db/sequelize');

class CommentController {
  // Ulozi novy komentar
  static async store(req, res) {
    try {
      const { postId } = req.params;
      const { content, author } = req.body;

      // Overeni existence postu
      const post = await db.Post.findByPk(postId);
      if (!post) {
        return res.status(404).send('Prispevek nenalezen');
      }

      // Validace obsahu
      if (!content || content.trim().length === 0) {
        return res.redirect(`/posts/${postId}#comment-form`);
      }

      await db.Comment.create({
        content: content.trim(),
        author: author ? author.trim() : 'Anonymni',
        postId: parseInt(postId)
      });

      res.redirect(`/posts/${postId}`);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).send('Chyba pri vytvareni komentare');
    }
  }

  // Maze komentar
  static async destroy(req, res) {
    try {
      const { postId, commentId } = req.params;

      const comment = await db.Comment.findByPk(commentId);
      if (!comment) {
        return res.status(404).send('Komentar nenalezen');
      }

      // Overeni, ze komentar patri k danemu postu
      if (comment.postId !== parseInt(postId)) {
        return res.status(403).send('Neopravneny pristup');
      }

      await comment.destroy();
      res.redirect(`/posts/${postId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).send('Chyba pri mazani komentare');
    }
  }
}

module.exports = CommentController;
