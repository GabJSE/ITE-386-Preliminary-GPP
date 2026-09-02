// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Profile = require('../models/Profile');
const EmployersProfile = require('../models/employersProfile');
const Admin = require('../models/Admin');

// --- SIGNUP (Jobhunter or Employer) ---
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 10);

    if (role === 'employer') {
      // ✅ only check for existing employer (not jobhunter)
      const existingEmployer = await EmployersProfile.findOne({ ownerEmail: email });
      if (existingEmployer)
        return res.status(409).json({ error: 'Email already registered as an employer' });

      const employer = new EmployersProfile({
        emailVerified: false,
        ownerEmail: email,
        ownerName: profileData.ownerName || '',
        ownerPosition: profileData.ownerPosition || '',
        ownerPhone: profileData.ownerPhone || '',
        companyName: profileData.companyName || '',
        companyWebsite: profileData.companyWebsite || '',
        companyDescription: profileData.companyDescription || '',
        industry: profileData.industry || '',
        companySize: profileData.companySize || '',
        companyStreetAddress: profileData.companyStreetAddress || '',
        companyCity: profileData.companyCity || '',
        companyRegion: profileData.companyRegion || '',
        companyPostalCode: profileData.companyPostalCode || '',
        companyCountry: profileData.companyCountry || '',
        companyLogo: profileData.companyLogo || '',
        linkedin: profileData.linkedin || '',
        passwordHash: hash,
      });

      employer.userId = employer._id;
      await employer.save();
      return res.status(201).json({ role: 'employer', id: employer._id });
    }

    // ✅ only check for existing jobhunter (not employer)
    const existingProfile = await Profile.findOne({ email });
    if (existingProfile)
      return res.status(409).json({ error: 'Email already registered as a jobhunter' });

    // ✅ sanitize nested array fields to prevent empty-string validation errors
const sanitized = { ...profileData };
['skills', 'languages', 'portfolio', 'certifications', 'experience', 'education'].forEach(key => {
  if (!Array.isArray(sanitized[key])) sanitized[key] = [];
});

const jobhunter = new Profile({
  ...sanitized,
  email,
  passwordHash: hash,
  role: 'jobhunter',
});

await jobhunter.save();


    res.status(201).json({ role: 'jobhunter', id: jobhunter._id });

  } catch (err) {
    console.error('Signup error:', err);
    if (err.name === 'ValidationError') {
      const details = {};
      Object.keys(err.errors || {}).forEach(k => (details[k] = err.errors[k].message));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    res.status(500).json({ error: 'Server error' });
  }
});



// --- LOGIN (Jobhunter, Employer, Admin) ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    // Try to find an account in Admin, Profile, or EmployersProfile.
    // Check Admin first so admin accounts take precedence when the same email
    // appears in multiple collections (script-created superadmin case).
    let user = null;
    let role = null;

    user = await Admin.findOne({ email });
    if (user) {
      role = user.role; // 'admin' or 'superadmin'
    } else {
      user = await Profile.findOne({ email });
      if (user) role = 'jobhunter';
      else {
        user = await EmployersProfile.findOne({ ownerEmail: email });
        if (user) role = 'employer';
      }
    }

    if (!user) return res.status(404).json({ error: 'Account not found' });

    if (!user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'deactivated') {
      return res.status(403).json({ error: 'Account deactivated. Please contact support.' });
    }

    const token = jwt.sign(
  {
    userId: user._id,
    email,
    role,
    userType: role === 'employer' ? 'EmployersProfile' : 'Profile',
  },
  process.env.JWT_SECRET || 'devsecret',
  { expiresIn: '7d' }
);



    res.json({
      token,
      userId: user._id,
      role,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
