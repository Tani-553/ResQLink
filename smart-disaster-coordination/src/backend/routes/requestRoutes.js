// routes/requestRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createRequest, getNearbyRequests, getMyRequests,
  acceptRequest, updateStatus, getAllRequests
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.post('/', protect, authorize('victim'), upload.single('photo'), createRequest);
router.get('/nearby', protect, authorize('volunteer', 'ngo'), getNearbyRequests);
router.get('/my', protect, authorize('victim'), getMyRequests);
router.get('/all', protect, authorize('admin'), getAllRequests);
router.put('/:id/accept', protect, authorize('volunteer'), acceptRequest);
router.put('/:id/status', protect, authorize('victim', 'volunteer', 'ngo', 'admin'), updateStatus);

module.exports = router;
