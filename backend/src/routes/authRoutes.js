const express = require('express');
const { register, login, me } = require('../controller/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        requireAuth, me);

module.exports = router;
