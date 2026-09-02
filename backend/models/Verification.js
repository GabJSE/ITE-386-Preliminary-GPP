const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  contact: { type: String, required: true },
  method: { type: String, enum: ['email', 'sms'], required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Verification', verificationSchema);
