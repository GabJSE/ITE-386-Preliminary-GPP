const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Profile = require('../models/Profile');
const EmployersProfile = require('../models/employersProfile');
const Verification = require('../models/Verification');
const sendEmail = require('../utils/sendEmail');

// STEP 1: request OTP
router.post('/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await Verification.create({ contact: email, method: 'email', code: otp, expiresAt });
  await sendEmail(email, 'WorkConnect Password Reset', `Your reset code is ${otp}.`);

  res.json({ success: true, message: 'OTP sent' });
});

// STEP 2: verify OTP
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;
  const record = await Verification.findOne({ contact: email, code: otp, used: false });
  if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

  record.used = true;
  await record.save();
  res.json({ success: true, message: 'OTP verified' });
});

// STEP 3: reset password
router.post('/reset', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ error: 'Email and new password required' });

  const hash = await bcrypt.hash(newPassword, 10);

  const updatedProfile = await Profile.findOneAndUpdate(
    { email },
    { passwordHash: hash },
    { new: true }
  );

  const updatedEmployer = await EmployersProfile.findOneAndUpdate(
    { ownerEmail: email },
    { passwordHash: hash },
    { new: true }
  );

  if (!updatedProfile && !updatedEmployer)
    return res.status(404).json({ error: 'Account not found' });

  res.json({ success: true, message: 'Password updated' });
});

module.exports = router;
