const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType', // dynamic reference (Profile or EmployersProfile)
  },
  userType: {
    type: String,
    required: true,
    enum: ['Profile', 'EmployersProfile'],
  },
  type: {
    type: String,
    enum: ['application', 'message', 'job_update', 'system', 'custom', 'expiration', 'job'],
    default: 'system',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
