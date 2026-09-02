const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  title: { type: String },

  // ✅ New optional job reference for accuracy
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: false
  },

  participants: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      userType: { type: String, enum: ['Profile', 'EmployersProfile'], required: true },
    },
  ],

  archivedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userType: { type: String, enum: ['Profile', 'EmployersProfile'] },
    },
  ],

  deletedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId },
      userType: { type: String, enum: ['Profile', 'EmployersProfile'] },
    },
  ],

  lastMessage: { type: String },
}, { timestamps: true });

conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
