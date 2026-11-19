const express = require('express');
const router = express.Router({ mergeParams: true });
const PostController = require('../controllers/PostController');
const { requireAuth } = require('../middleware/auth');

// Middleware pro parsování formulářů
router.use(express.urlencoded({ extended: true }));

// GET /posts - seznam všech příspěvků
router.get('/', PostController.index);

// GET /posts/create - formulář pro nový příspěvek
router.get('/create', requireAuth, PostController.create);

// POST /posts - uloží nový příspěvek
router.post('/', requireAuth, PostController.store);

// GET /posts/:id - detail příspěvku
router.get('/:id', PostController.show);

// GET /posts/:id/edit - formulář pro editaci
router.get('/:id/edit', requireAuth, PostController.edit);

// POST /posts/:id - aktualizuje příspěvek
router.post('/:id', requireAuth, PostController.update);

// POST /posts/:id/delete - maže příspěvek
router.post('/:id/delete', requireAuth, PostController.destroy);

module.exports = router;
