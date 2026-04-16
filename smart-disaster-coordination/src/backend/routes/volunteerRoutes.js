const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');

const router = express.Router();

router.get('/active', protect, authorize('ngo', 'admin'), async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer', isActive: true })
      .select('name phone location isVerified')
      .sort({ updatedAt: -1, createdAt: -1 });

    return res.json({ success: true, count: volunteers.length, data: volunteers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/my-tasks', protect, authorize('volunteer'), async (req, res) => {
  try {
    const tasks = await HelpRequest.find({
      assignedVolunteer: req.user._id,
      status: { $in: ['assigned', 'in-progress'] }
    })
      .populate('victim', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/location', protect, authorize('volunteer'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid location coordinates.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    return res.json({ success: true, message: 'Location updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
