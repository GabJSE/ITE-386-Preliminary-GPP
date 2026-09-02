const mongoose = require('mongoose');

const employersProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['employer'], default: 'employer' },
  status: { type: String, default: 'active', enum: ['active', 'deactivated'] },
  companyWebsite: { type: String },
  tagline: { type: String },
  industry: { type: String },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  companyStreetAddress: { type: String },
  companyCity: { type: String },
  companyRegion: { type: String },
  companyPostalCode: { type: String },
  companyCountry: { type: String },
  companyLocation: { type: String },
  officeLocations: { type: [String], default: [] },
  ownerName: { type: String },
  ownerPosition: { type: String },
  ownerPhone: { type: String },
  phoneCountry: { type: String, default: '+63' },
  ownerEmail: { type: String },
  companyDescription: { type: String },
  mission: { type: String },
  vision: { type: String },
  coreValues: { type: [String], default: [] },
  foundingStory: { type: String },
  achievements: { type: [String], default: [] },
  companyLogo: { type: String },
  linkedin: { type: String },
  instagram: { type: String },
  facebook: { type: String },
  twitter: { type: String },
  blog: { type: String },
  careersPage: { type: String },
  emailVerified: { type: Boolean, default: false },
}, { timestamps: true });

employersProfileSchema.index({ userId: 1 });
employersProfileSchema.index({ companyName: 1 });

module.exports = mongoose.model('EmployersProfile', employersProfileSchema);
