const express = require('express');
const router = express.Router();

// Models
const Profile = require('../models/Profile');
const EmployersProfile = require('../models/employersProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Helper to build date ranges
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

// GET /api/admin/stats
// Basic high-level counts used by the admin dashboard
router.get('/stats', async (req, res) => {
  try {
    // Total users: jobseekers and employers
    const totalJobseekers = await Profile.countDocuments({ role: 'jobhunter' }).catch(() => 0);
    const totalEmployers = await EmployersProfile.countDocuments().catch(() => 0);

    // Job posting activity
    const totalActiveJobs = await Job.countDocuments({ status: /active/i }).catch(() => 0);
    const newJobs24h = await Job.countDocuments({ postedAt: { $gte: hoursAgo(24) } }).catch(() => 0);
    const newJobs7d = await Job.countDocuments({ postedAt: { $gte: hoursAgo(24 * 7) } }).catch(() => 0);

    // Application activity
    const totalApplications = await Application.countDocuments().catch(() => 0);
    const applications24h = await Application.countDocuments({ applicationDate: { $gte: hoursAgo(24) } }).catch(() => 0);

    res.json({
      totalJobseekers,
      totalEmployers,
      totalActiveJobs,
      newJobs24h,
      newJobs7d,
      totalApplications,
      applications24h,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error computing admin stats' });
  }
});

// GET /api/admin/analytics
// More detailed metrics; keep shape similar to old Analytics component
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = (await Profile.countDocuments().catch(() => 0)) + (await EmployersProfile.countDocuments().catch(() => 0));
    const totalJobs = await Job.countDocuments().catch(() => 0);
    const totalApplications = await Application.countDocuments().catch(() => 0);
    const flaggedReports = 0; // placeholder if you add a Reports model later
  // Active employers (count all employer profiles)
  const activeEmployers = await EmployersProfile.countDocuments().catch(() => 0);
    const activeJobseekers = await Profile.countDocuments({}).catch(() => 0);

    res.json({
      totalUsers,
      totalJobs,
      totalApplications,
      flaggedReports,
      activeEmployers,
      activeJobseekers,
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Server error computing analytics' });
  }
});

module.exports = router;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  // 🔹 Permission control
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },

  resetToken: String,
resetTokenExpiry: Date,


  // Optional: audit tracking
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Password helper methods
AdminSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

AdminSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('Admin', AdminSchema);
