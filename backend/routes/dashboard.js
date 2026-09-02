// routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // if you already have one
const Jobs = require('../models/Job'); // adjust name if needed
const Applications = require('../models/Application'); // adjust name if needed

// --- GET employer dashboard stats ---
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: 'Missing user ID' });

    // Get employer’s active jobs
    const activeJobs = await Jobs.find({ ownerId: userId, status: 'active' });

    // Total applicants for those jobs
    const jobIds = activeJobs.map(j => j._id);
    const totalApplicants = await Applications.countDocuments({ jobId: { $in: jobIds } });

    // Example: get ongoing interviews (you can refine this later)
    const ongoingInterviews = await Applications.find({
      jobId: { $in: jobIds },
      status: 'interview',
    });

    res.json({
      activeJobs,
      totalApplicants,
      ongoingInterviews,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
});

module.exports = router;
