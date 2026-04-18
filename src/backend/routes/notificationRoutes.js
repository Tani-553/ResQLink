// routes/notificationRoutes.js — Member 3: Notification Specialist
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const { saveSubscription } = require('../../notifications/pushService');

// GET /api/notifications — Get my notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// PUT /api/notifications/:id/read — Mark as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, messageKey: 'notification.markedAsRead' });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, messageKey: 'notification.allMarkedAsRead' });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// POST /api/notifications/subscribe — Save PWA push subscription
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    await saveSubscription(req.user._id, subscription);
    res.json({ success: true, messageKey: 'notification.pushSubscriptionSaved' });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

module.exports = router;
