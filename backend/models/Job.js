const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  type: { type: String },
  minSalary: Number,
  maxSalary: Number,
  currency: String,
  salaryFrequency: String,
  logoName: String,
  logoUrl: String,
  summary: String,
  description: String,
  // structured fields from employer job posting
  responsibilities: [String],
  requirements: [String],
  preferred: { type: String },
  skills: [String],
  experienceLevel: String,
  educationLevel: String,
  benefits: [String],
  numberOpenings: { type: Number, default: 1 },
  applicationMethod: String,
  applicationTarget: String,
  city: String,
  stateOrProvince: String,
  country: String,
  
  // application deadlines / category
  deadline: { type: Date, default: null },
  expirationDate: { type: Date, default: null },
  applicationDeadline: { type: Date, default: null },

  // status: Active | Closed | Draft
  status: { type: String, default: 'Active' },
  category: String,
  easyApply: { type: Boolean, default: false },
  isRemote: { type: Boolean, default: false },
  isHybrid: { type: Boolean, default: false },
  isFullTime: { type: Boolean, default: false },
  postedAt: { type: Date, default: Date.now },
  applied: { type: Boolean, default: false },
  exclusive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  // right before module.exports:
  jobReferenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: false },
});

module.exports = mongoose.model('Job', JobSchema);