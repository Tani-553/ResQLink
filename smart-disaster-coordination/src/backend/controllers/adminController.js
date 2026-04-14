const User = require('../models/User');
const NGOProfile = require('../models/NGOProfile');
const HelpRequest = require('../models/HelpRequest');
const Notification = require('../models/Notification');
const { broadcastEmergency, sendToUser } = require('../../notifications/fcmService');
const { sendWebPush } = require('../../notifications/pushService');

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      resolvedRequests,
      totalVolunteers,
      totalNGOs,
      activeNGOs,
      openTasks,
      totalUsers
    ] = await Promise.all([
      HelpRequest.countDocuments(),
      HelpRequest.countDocuments({ status: 'pending' }),
      HelpRequest.countDocuments({ status: 'resolved' }),
      User.countDocuments({ role: 'volunteer', isActive: true }),
      NGOProfile.countDocuments(),
      NGOProfile.countDocuments({ isApproved: true }),
      HelpRequest.countDocuments({ status: { $in: ['assigned', 'in-progress'] } }),
      User.countDocuments()
    ]);

    return res.json({
      success: true,
      data: { totalRequests, pendingRequests, resolvedRequests, totalVolunteers, totalNGOs, activeNGOs, openTasks, totalUsers }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNGOs = async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = approved !== undefined ? { isApproved: approved === 'true' } : {};
    const ngos = await NGOProfile.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 });
    return res.json({ success: true, count: ngos.length, data: ngos });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyNGO = async (req, res) => {
  try {
    const { approved } = req.body;
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ success: false, message: 'The approved field must be true or false.' });
    }

    const ngo = await NGOProfile.findByIdAndUpdate(
      req.params.id,
      { isApproved: approved, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    ).populate('user', 'name email');

    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found.' });
    }

    await User.findByIdAndUpdate(ngo.user._id, { isVerified: approved });

    const title = approved ? 'NGO Approved!' : 'NGO Application Rejected';
    const message = approved
      ? `Your NGO "${ngo.orgName}" has been approved. You can now access the NGO dashboard.`
      : `Your NGO "${ngo.orgName}" application was not approved. Please contact admin.`;

    await Notification.create({
      recipient: ngo.user._id,
      type: 'ngo-approved',
      title,
      message,
      triggeredBy: req.user._id
    });

    await sendToUser(ngo.user._id, {
      title,
      body: message,
      data: { ngoId: ngo._id.toString(), approved: String(approved) }
    });
    await sendWebPush(ngo.user._id, {
      title,
      body: message,
      data: { ngoId: ngo._id.toString(), approved }
    });

    req.io.emit('ngo-verified', { ngoId: ngo._id, approved });
    return res.json({ success: true, data: ngo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.broadcast = async (req, res) => {
  try {
    const { title, message, zone } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Broadcast title and message are required.' });
    }

    const users = await User.find({ isActive: true }).select('_id');
    const notifications = users.map((user) => ({
      recipient: user._id,
      type: 'broadcast',
      title,
      message,
      data: { zone },
      triggeredBy: req.user._id
    }));

    if (notifications.length) {
      await Notification.insertMany(notifications);
    }

    await broadcastEmergency({ title, message, zone });
    req.io.emit('broadcast', { title, message, zone });

    return res.json({ success: true, message: `Broadcast sent to ${users.length} users.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
