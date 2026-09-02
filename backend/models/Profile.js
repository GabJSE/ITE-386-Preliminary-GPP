const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  // Basic account info
  email: { type: String, required: true, unique: true },
  // passwordHash is optional here because authentication is handled by the `User` model
  // and some profiles are created/updated after signup without including a password hash.
  passwordHash: { type: String },
  role: { type: String, enum: ['jobhunter'], default: 'jobhunter' },
 status: { type: String, default: 'active', enum: ['active', 'deactivated'] },

  // Personal info
  firstName: String,
  lastName: String,
  gender: String,
  dob: Date, // maps from data.dateOfBirth
  nationality: String,

  // Contact and location
  phone: String,
  phoneCountry: String,
  country: String,
  addressLine: String,
  city: String,
  stateprovince: String,
  postalCode: String,
  image: String, // profile avatar
  resumeUrl: String,
  // Documents and external links
  githubUrl: String,
  lettersOfRecommendation: [String],
  professionalLicenses: [String],
  bio: String,
  linkedin: String,

  // Job preferences
  desiredJobType: String,
  workArrangement: String, // e.g. remote, hybrid, on-site
  expectedSalary: String,
  // New jobseeker preference fields
  preferredJobCategories: [String],
  preferredLocation: String,
  willingToRelocate: { type: Boolean, default: false },
  careerLevelTarget: String,

  // Professional info
  skills: [String],
  languages: [String],
  portfolio: [String],
  // Certifications: support structured entries with optional issuer, date and file URL
  certifications: [
    {
      name: String,
      issuer: String,
      dateIssued: Date,
      url: String,
    }
  ],

  // Experience and education
  experience: [
    {
      company: String,
      position: String,
      duration: String,
      description: String,
    },
  ],
  education: [
    {
      school: String,
      degree: String,
      fieldOfStudy: String,
      startYear: String,
      endYear: String,
      status: String, // e.g., Enrolled, Graduated
      description: String,
    },
  ],

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Profile', ProfileSchema);
