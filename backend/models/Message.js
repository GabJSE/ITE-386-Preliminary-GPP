const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },

  from: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'fromType'
  },
  fromType: {
    type: String,
    required: true,
    enum: ['Profile', 'EmployersProfile']
  },

  to: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'toType'
  },
  toType: {
    type: String,
    required: true,
    enum: ['Profile', 'EmployersProfile']
  },
  

  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  deletedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId } // <-- Soft delete per user
    }
  ]
}, { timestamps: true });

messageSchema.index({ to: 1, read: 1 });


module.exports = mongoose.model('Message', messageSchema);
