const express = require('express');
const AuthController = require('../controllers/AuthController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/auth/register', AuthController.registerForm);
router.post('/auth/register', AuthController.register);
router.get('/auth/login', AuthController.loginForm);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', requireAuth, AuthController.logout);
router.get('/account', requireAuth, AuthController.account);
router.post('/account/delete', requireAuth, AuthController.deleteAccount);

module.exports = router;
