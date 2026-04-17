// routes/communityRoutes.js - Community Helper Network Routes
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const CommunityMember = require('../models/CommunityMember');
const CommunityRequest = require('../models/CommunityRequest');
const User = require('../models/User');

// POST /api/community/register — Register as community helper
router.post('/register', protect, async (req, res) => {
  try {
    const { skills, bio, languages, latitude, longitude, isAvailable } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
    }

    let communityMember = await CommunityMember.findOne({ user: req.user._id });

    if (communityMember) {
      // Update existing profile
      communityMember.skills = skills || communityMember.skills;
      communityMember.bio = bio || communityMember.bio;
      communityMember.languages = languages || communityMember.languages;
      communityMember.location = { type: 'Point', coordinates: [longitude, latitude] };
      communityMember.isAvailable = isAvailable !== undefined ? isAvailable : communityMember.isAvailable;
      await communityMember.save();
      return res.json({ success: true, data: communityMember, message: 'Profile updated.' });
    }

    // Create new profile
    communityMember = await CommunityMember.create({
      user: req.user._id,
      skills: skills || [],
      bio: bio || '',
      languages: languages || ['en'],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      location: { type: 'Point', coordinates: [longitude, latitude] }
    });

    await communityMember.populate('user', 'name phone');
    res.status(201).json({ success: true, data: communityMember, message: 'Registered as community helper.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/community/nearby — Get nearby community members
router.get('/nearby', protect, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
    }

    const members = await CommunityMember.find({
      isAvailable: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
      .populate('user', 'name')
      .select('user skills bio rating location isAvailable languages');

    // Calculate distance for each member
    const membersWithDistance = members.map(member => {
      const [memberLng, memberLat] = member.location.coordinates;
      const toRadians = (degrees) => (degrees * Math.PI) / 180;
      const earthRadiusM = 6371000;
      const deltaLat = toRadians(memberLat - parseFloat(latitude));
      const deltaLng = toRadians(memberLng - parseFloat(longitude));
      const startLat = toRadians(parseFloat(latitude));
      const endLat = toRadians(memberLat);

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = (earthRadiusM * c) / 1000; // Convert to km

      return {
        _id: member._id,
        name: member.user?.name || 'Community Member',
        skills: member.skills,
        bio: member.bio,
        rating: member.rating,
        distance: distance.toFixed(1),
        isAvailable: member.isAvailable,
        languages: member.languages
      };
    });

    res.json({ success: true, count: membersWithDistance.length, data: membersWithDistance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/community/request/:id — Send help request to community member
router.post('/request/:id', protect, authorize('victim'), async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, message: 'Help description is required.' });
    }

    const communityMember = await CommunityMember.findById(req.params.id);
    if (!communityMember) {
      return res.status(404).json({ success: false, message: 'Community member not found.' });
    }

    const communityRequest = await CommunityRequest.create({
      victim: req.user._id,
      communityMember: req.params.id,
      description
    });

    res.status(201).json({ success: true, data: communityRequest, message: 'Help request sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/community/respond/:id — Accept or decline help request
router.put('/respond/:id', protect, async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Response must be "accepted" or "declined".' });
    }

    const communityRequest = await CommunityRequest.findById(req.params.id);
    if (!communityRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Verify that the community member responding is the one who received the request
    const communityMember = await CommunityMember.findById(communityRequest.communityMember);
    if (communityMember.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only respond to requests sent to you.' });
    }

    communityRequest.status = response;
    communityRequest.respondedAt = new Date();
    await communityRequest.save();

    if (response === 'accepted') {
      await CommunityMember.findByIdAndUpdate(communityRequest.communityMember, {
        $inc: { helpCount: 1 }
      });
    }

    res.json({ success: true, data: communityRequest, message: `Request ${response}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/community/my-requests — Requests sent to community member
router.get('/my-requests', protect, async (req, res) => {
  try {
    const communityMember = await CommunityMember.findOne({ user: req.user._id });
    if (!communityMember) {
      return res.json({ success: true, data: [], message: 'No requests.' });
    }

    const requests = await CommunityRequest.find({ communityMember: communityMember._id })
      .populate('victim', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/community/sent-requests — Requests victim has sent
router.get('/sent-requests', protect, authorize('victim'), async (req, res) => {
  try {
    const requests = await CommunityRequest.find({ victim: req.user._id })
      .populate({
        path: 'communityMember',
        populate: { path: 'user', select: 'name' }
      })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => ({
      _id: req._id,
      memberName: req.communityMember?.user?.name || 'Unknown',
      description: req.description,
      status: req.status,
      createdAt: req.createdAt,
      respondedAt: req.respondedAt
    }));

    res.json({ success: true, data: formattedRequests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
