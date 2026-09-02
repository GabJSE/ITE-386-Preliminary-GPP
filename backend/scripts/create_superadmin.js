#!/usr/bin/env node
/**
 * Simple script to create a superadmin account.
 * Usage:
 *   node scripts/create_superadmin.js --email=you@example.com --password=pass123 --name="Admin Name"
 * Or set env vars SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD and run without args.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
// Load backend/.env (this repository stores MONGO_URI in backend/.env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Admin = require('../models/Admin');

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function main() {
  const email = parseArg('email') || process.env.SUPERADMIN_EMAIL;
  const password = parseArg('password') || process.env.SUPERADMIN_PASSWORD;
  const name = parseArg('name') || process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('Usage: node scripts/create_superadmin.js --email=you@example.com --password=secret');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/workconnect';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri).catch(err => { console.error('Mongo connect failed', err); process.exit(1); });

  try {
    let existing = await Admin.findOne({ email });
    if (existing) {
      console.log('Admin already exists:', email, 'role=', existing.role);
      // If existing is not superadmin, upgrade to superadmin
      if (existing.role !== 'superadmin') {
        existing.role = 'superadmin';
        if (password) existing.passwordHash = await bcrypt.hash(password, 10);
        existing.name = existing.name || name;
        await existing.save();
        console.log('Upgraded existing admin to superadmin.');
      }
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const admin = new Admin({ email, passwordHash: hash, role: 'superadmin', name });
    await admin.save();
    console.log('Created superadmin:', email);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create superadmin', err);
    process.exit(1);
  }
}

main();
