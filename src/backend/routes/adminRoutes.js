// routes/adminRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const { getDashboard, getNGOs, verifyNGO, broadcast, getUsers } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, authorize('admin'), getDashboard);
router.get('/ngos', protect, authorize('admin'), getNGOs);
router.put('/ngos/:id/verify', protect, authorize('admin'), verifyNGO);
router.post('/broadcast', protect, authorize('admin'), broadcast);
router.get('/users', protect, authorize('admin'), getUsers);

module.exports = router;
