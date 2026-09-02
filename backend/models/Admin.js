const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  name: { type: String },
  status: { type: String, default: 'active', enum: ['active', 'deactivated'] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Admin', AdminSchema);
