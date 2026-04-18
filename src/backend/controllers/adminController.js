// controllers/adminController.js — Member 2: Backend Developer
const User = require('../models/User');
const NGOProfile = require('../models/NGOProfile');
const HelpRequest = require('../models/HelpRequest');
const Notification = require('../models/Notification');

// GET /api/admin/dashboard — System stats
exports.getDashboard = async (req, res) => {
  try {
    const [totalRequests, pendingRequests, resolvedRequests, totalVolunteers, totalNGOs, activeNGOs] = await Promise.all([
      HelpRequest.countDocuments(),
      HelpRequest.countDocuments({ status: 'pending' }),
      HelpRequest.countDocuments({ status: 'resolved' }),
      User.countDocuments({ role: 'volunteer', isActive: true }),
      NGOProfile.countDocuments(),
      NGOProfile.countDocuments({ isApproved: true }),
    ]);
    res.json({ success: true, data: { totalRequests, pendingRequests, resolvedRequests, totalVolunteers, totalNGOs, activeNGOs } });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// GET /api/admin/ngos — List NGOs pending verification
exports.getNGOs = async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = approved !== undefined ? { isApproved: approved === 'true' } : {};
    const ngos = await NGOProfile.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 });
    res.json({ success: true, count: ngos.length, data: ngos });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// PUT /api/admin/ngos/:id/verify — Approve or reject NGO
exports.verifyNGO = async (req, res) => {
  try {
    const { approved } = req.body;
    const ngo = await NGOProfile.findByIdAndUpdate(
      req.params.id,
      { isApproved: approved, approvedBy: req.user._id, approvedAt: approved ? new Date() : null },
      { new: true }
    ).populate('user', 'name email');

    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    // Notify NGO user
    await Notification.create({
      recipient: ngo.user._id,
      type: 'ngo-approved',
      title: approved ? 'NGO Approved!' : 'NGO Application Rejected',
      message: approved ? `Your NGO "${ngo.orgName}" has been approved. You can now access the NGO dashboard.`
                        : `Your NGO "${ngo.orgName}" application was not approved. Please contact admin.`,
      triggeredBy: req.user._id
    });

    req.io.emit('ngo-verified', { ngoId: ngo._id, approved });
    res.json({ success: true, data: ngo });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// POST /api/admin/broadcast — Send broadcast to all users
exports.broadcast = async (req, res) => {
  try {
    const { title, message, zone } = req.body;
    const users = await User.find({ isActive: true });
    const notifications = users.map(u => ({
      recipient: u._id, type: 'broadcast', title, message,
      data: { zone }, triggeredBy: req.user._id
    }));
    await Notification.insertMany(notifications);
    req.io.emit('broadcast', { title, message, zone });
    res.json({ success: true, messageKey: 'notification.broadcastSentSuccess', count: users.length });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// GET /api/admin/users — All users
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};
