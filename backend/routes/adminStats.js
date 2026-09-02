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
router.get('/stats', async (req, res) => {
  try {
    const totalJobseekers = await Profile.countDocuments({ role: 'jobhunter' }).catch(() => 0);
    const totalEmployers = await EmployersProfile.countDocuments().catch(() => 0);

    const totalActiveJobs = await Job.countDocuments({ status: /active/i }).catch(() => 0);
    const newJobs24h = await Job.countDocuments({ postedAt: { $gte: hoursAgo(24) } }).catch(() => 0);
    const newJobs7d = await Job.countDocuments({ postedAt: { $gte: hoursAgo(24 * 7) } }).catch(() => 0);

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
    res.status(500).json({ error: 'Server error fetching admin stats' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = (await Profile.countDocuments().catch(() => 0)) + (await EmployersProfile.countDocuments().catch(() => 0));
    const totalJobs = await Job.countDocuments().catch(() => 0);
    const totalApplications = await Application.countDocuments().catch(() => 0);
  const flaggedReports = 0; // placeholder
  // Active employers: count all employer profiles (option A)
  const activeEmployers = await EmployersProfile.countDocuments().catch(() => 0);
    const activeJobseekers = await Profile.countDocuments().catch(() => 0);

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
    res.status(500).json({ error: 'Server error fetching analytics' });
  }
});

module.exports = router;
