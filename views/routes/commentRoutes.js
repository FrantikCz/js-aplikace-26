const express = require('express');
const router = express.Router({ mergeParams: true });
const CommentController = require('../controllers/CommentController');
const { requireAuth } = require('../middleware/auth');

// Middleware pro parsovani formularu
router.use(express.urlencoded({ extended: true }));

// POST /posts/:postId/comments - ulozi novy komentar
router.post('/posts/:postId/comments', requireAuth, CommentController.store);

// POST /posts/:postId/comments/:commentId/delete - maze komentar
router.post('/posts/:postId/comments/:commentId/delete', requireAuth, CommentController.destroy);

module.exports = router;
