const express = require('express');
const router = express.Router({ mergeParams: true });
const CommentController = require('../controllers/CommentController');

// Middleware pro parsovani formularu
router.use(express.urlencoded({ extended: true }));

// POST /posts/:postId/comments - ulozi novy komentar
router.post('/posts/:postId/comments', CommentController.store);

// POST /posts/:postId/comments/:commentId/delete - maze komentar
router.post('/posts/:postId/comments/:commentId/delete', CommentController.destroy);

module.exports = router;
