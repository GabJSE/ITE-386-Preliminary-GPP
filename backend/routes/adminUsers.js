const express = require('express');
const router = express.Router();

// Try to require models (may be absent in dev fallback)
let Profile;
let EmployersProfile;
try { Profile = require('../models/Profile'); } catch (e) { Profile = null; }
try { EmployersProfile = require('../models/employersProfile'); } catch (e) { EmployersProfile = null; }

// GET /api/admin/users
// Returns combined list of jobseeker profiles and employer profiles in a unified shape.
router.get('/', async (req, res) => {
  try {
    const results = [];

    if (Profile) {
      const profiles = await Profile.find().lean().limit(5000);
      for (const p of profiles) {
        results.push({
          _id: p._id,
          type: 'jobseeker',
          fullName: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || null,
          email: p.email || null,
          role: p.role || 'jobseeker',
          status: p.status || 'active',
          createdAt: p.createdAt || p.created || null,
          raw: p,
        });
      }
    }

    if (EmployersProfile) {
      const emps = await EmployersProfile.find().lean().limit(5000);
      for (const e of emps) {
        results.push({
          _id: e._id,
          type: 'employer',
          fullName: e.companyName || e.ownerName || null,
          email: e.ownerEmail || null,
          role: 'employer',
          status: e.status || (e.emailVerified ? 'active' : 'active'),
          createdAt: e.createdAt || e.created || null,
          raw: e,
        });
      }
    }

    // Sort newest first by createdAt when available
    results.sort((a, b) => {
      const A = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const B = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return B - A;
    });

    res.json(results);
  } catch (err) {
    console.error('adminUsers error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
