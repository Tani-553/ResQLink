// routes/ngoRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const NGOProfile = require('../models/NGOProfile');

const upload = multer({ dest: 'uploads/docs/' });

// POST /api/ngo/register — NGO submits profile + docs
router.post('/register', protect, authorize('ngo'), upload.array('documents', 5), async (req, res) => {
  try {
    const { orgName, description, contactEmail, contactPhone } = req.body;
    const existing = await NGOProfile.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ success: false, messageKey: 'ngo.profileAlreadyExists' });

    const docs = req.files ? req.files.map(f => ({ filename: f.originalname, path: f.path })) : [];
    const ngo = await NGOProfile.create({
      user: req.user._id, orgName, description, contactEmail, contactPhone, documents: docs
    });
    req.io.emit('ngo-pending', { ngoId: ngo._id, orgName });
    res.status(201).json({ success: true, data: ngo });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// GET /api/ngo/profile — NGO views own profile
router.get('/profile', protect, authorize('ngo'), async (req, res) => {
  try {
    const ngo = await NGOProfile.findOne({ user: req.user._id }).populate('volunteers', 'name phone');
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });
    res.json({ success: true, data: ngo });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// PUT /api/ngo/resources — Update resource counts
router.put('/resources', protect, authorize('ngo'), async (req, res) => {
  try {
    const { reliefKits, shelters, vehicles, medicalSupplies } = req.body;
    const ngo = await NGOProfile.findOneAndUpdate(
      { user: req.user._id },
      { resources: { reliefKits, shelters, vehicles, medicalSupplies } },
      { new: true }
    );
    res.json({ success: true, data: ngo });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

// POST /api/ngo/assign-volunteer — Assign volunteer to zone
router.post('/assign-volunteer', protect, authorize('ngo'), async (req, res) => {
  try {
    const { volunteerId, zone } = req.body;
    const ngo = await NGOProfile.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { volunteers: volunteerId }, $addToSet: { activeZones: zone } },
      { new: true }
    );
    req.io.to(`zone-${zone}`).emit('volunteer-assigned', { volunteerId, zone });
    res.json({ success: true, data: ngo });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
});

module.exports = router;
