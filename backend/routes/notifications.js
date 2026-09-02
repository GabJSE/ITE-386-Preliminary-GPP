const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// ✅ Create a new notification
router.post('/', auth, async (req, res) => {
  try {
    const { userId, userType, type, title, message, link } = req.body;
    if (!userId || !userType || !title || !message)
      return res.status(400).json({ error: 'Missing required fields' });

    const notification = new Notification({
      userId,
      userType,
      type,
      title,
      message,
      link,
    });

    await notification.save();

    // emit real-time notification via Socket.io
    const io = req.app.get('io');
    io.to(userId.toString()).emit('notification', notification);

    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get all notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
