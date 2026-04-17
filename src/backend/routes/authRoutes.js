// routes/authRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateLocation } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/update-location', protect, updateLocation);

module.exports = router;
