const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/authMiddleware');
const NGOProfile = require('../models/NGOProfile');
const User = require('../models/User');
const { notifyAdminNGOPending } = require('../../notifications/fcmService');

const router = express.Router();
const upload = multer({ dest: 'uploads/docs/' });

const serializeDocuments = (documents = []) =>
  documents.map((document) => ({
    ...document.toObject?.() || document,
    publicUrl: document.publicUrl || `/uploads/docs/${path.basename(document.path)}`
  }));

const serializeNGO = (ngo) => {
  const data = ngo.toObject ? ngo.toObject() : ngo;
  return {
    ...data,
    documents: serializeDocuments(data.documents)
  };
};

const requireApprovedNGO = async (userId) => {
  const ngo = await NGOProfile.findOne({ user: userId });
  if (!ngo) {
    return { error: { status: 404, message: 'NGO profile not found.' } };
  }

  if (!ngo.isApproved) {
    return { error: { status: 403, message: 'Your NGO is pending admin approval. Dashboard actions unlock after approval.' } };
  }

  return { ngo };
};

router.post('/register', protect, authorize('ngo'), upload.array('documents', 5), async (req, res) => {
  try {
    const { orgName, description, contactEmail, contactPhone } = req.body;

    if (!orgName || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Organization name, contact email and contact phone are required.'
      });
    }

    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one NGO document must be uploaded for admin review.'
      });
    }

    const existing = await NGOProfile.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'NGO profile already exists.' });
    }

    const documents = req.files.map((file) => ({
      filename: file.originalname,
      path: file.path,
      publicUrl: `/uploads/docs/${path.basename(file.path)}`
    }));

    const ngo = await NGOProfile.create({
      user: req.user._id,
      orgName,
      description,
      contactEmail,
      contactPhone,
      documents
    });

    await User.findByIdAndUpdate(req.user._id, { isVerified: false });
    await notifyAdminNGOPending(orgName, ngo._id);
    req.io.emit('ngo-pending', { ngoId: ngo._id, orgName });

    return res.status(201).json({ success: true, data: serializeNGO(ngo) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/profile', protect, authorize('ngo'), async (req, res) => {
  try {
    const ngo = await NGOProfile.findOne({ user: req.user._id }).populate('volunteers', 'name phone');
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO profile not found.' });
    }

    return res.json({ success: true, data: serializeNGO(ngo) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/resources', protect, authorize('ngo'), async (req, res) => {
  try {
    const approval = await requireApprovedNGO(req.user._id);
    if (approval.error) {
      return res.status(approval.error.status).json({ success: false, message: approval.error.message });
    }

    const { reliefKits, shelters, vehicles, medicalSupplies } = req.body;
    const ngo = await NGOProfile.findOneAndUpdate(
      { user: req.user._id },
      { resources: { reliefKits, shelters, vehicles, medicalSupplies } },
      { new: true }
    );

    return res.json({ success: true, data: serializeNGO(ngo) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assign-volunteer', protect, authorize('ngo'), async (req, res) => {
  try {
    const approval = await requireApprovedNGO(req.user._id);
    if (approval.error) {
      return res.status(approval.error.status).json({ success: false, message: approval.error.message });
    }

    const { volunteerId, zone } = req.body;

    if (!volunteerId || !zone) {
      return res.status(400).json({ success: false, message: 'Volunteer ID and zone are required.' });
    }

    const volunteer = await User.findOne({ _id: volunteerId, role: 'volunteer' });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' });
    }

    const ngo = await NGOProfile.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { volunteers: volunteerId, activeZones: zone } },
      { new: true }
    ).populate('volunteers', 'name phone');

    req.io.to(`zone-${zone}`).emit('volunteer-assigned', { volunteerId, zone });
    return res.json({ success: true, data: serializeNGO(ngo) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
