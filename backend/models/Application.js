const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployerProfile', required: true },
  jobId: { type: String, required: true },
  jobTitle: { type: String },

  // Applicant info snapshot (denormalized)
  fullName: String,
  email: String,
  contactNumber: String,
  location: String,
  profilePictureUrl: String,
  resumeUrl: String,

  // Education
  education: {
    highestAttainment: String,
    school: String,
    course: String,
    yearGraduated: String,
  },

  // Work experience (array)
  workExperience: [{
    jobTitle: String,
    company: String,
    startDate: String,
    endDate: String,
    responsibilities: String,
  }],

  // Skills & attachments
  skills: [String],
  certificates: [String],

  // Application details
  coverLetter: String,
  expectedSalary: String,
  availability: String,
  applicationDate: { type: Date, default: Date.now },

  // System metadata
  // Expand status enum to include values used by the employer UI and backend
  // (e.g. 'shortlist' and 'hired'). Keeping older values for compatibility.
  status: { type: String, enum: ['pending','reviewed','accepted','rejected','shortlist','hired'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema);
