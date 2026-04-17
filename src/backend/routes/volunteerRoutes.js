// routes/volunteerRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');

// GET /api/volunteers/active — List active volunteers (NGO/Admin)
router.get('/active', protect, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', isActive: true }).select('name phone location');
    res.json({ success: true, count: volunteers.length, data: volunteers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/volunteers/my-tasks — Volunteer's accepted tasks
router.get('/my-tasks', protect, authorize('volunteer'), async (req, res) => {
  try {
    const tasks = await HelpRequest.find({ assignedVolunteer: req.user._id, status: { $in: ['assigned', 'in-progress'] } })
      .populate('victim', 'name phone').sort({ createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
