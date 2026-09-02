import React, { useEffect, useState } from 'react';
import './admin.css';
import './JobApproval.css';
import { useAuth } from '../../contexts/AuthContext';

export default function JobApprovals() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [jobToDelete, setJobToDelete] = useState(null); // <-- ADD THIS
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // <-- ADD THIS
  const { token } = useAuth();

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = () => {
    setLoading(true);
    setError(''); 
    fetch('/api/jobs')
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw err; });
        return res.json();
      })
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.jobs || []);
        setJobs(arr);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch jobs:', err);
        setError('Failed to fetch jobs.');
        setJobs([]);
        setLoading(false);
      });
  };

  // --- View Modal ---
  const handleView = (job) => {
    setSelectedJob(job); 
    setIsModalOpen(true); 
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
  };
  
  // --- Delete Modal ---
  const handleDelete = (job) => {
    // This now *opens* the confirmation modal
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
    setError(''); // Clear old errors
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setJobToDelete(null);
    setError('');
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    const id = jobToDelete._id || jobToDelete.id;

    setError('');
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete job.');
      }

      // Success: Remove job from state and close modal
      setJobs(prevJobs => prevJobs.filter(j => j._id !== id));
      closeDeleteModal();

    } catch (err) {
      console.error('Delete error:', err);
      // On error, keep modal open and show message
      setError(err.message);
    }
  };

  // --- Page Header Action ---
  const handleRefresh = () => {
    fetchJobs(); 
  };

  // --- HELPER FUNCTIONS ---
  const getCurrencySymbol = (currency) => {
    if (!currency) return '₱';
    const c = currency.toUpperCase();
    if (c === 'PHP') return '₱';
    if (c === 'USD') return '$';
    if (c === 'EUR') return '€';
    return currency;
  }

  const formatSalary = (job) => {
    const symbol = getCurrencySymbol(job.currency); 
    const type = job.salaryFrequency ? ` ${job.salaryFrequency}` : '';
    if (job.salary) return `${symbol}${job.salary}${type}`;
    if (job.minSalary && job.maxSalary) return `${symbol}${job.minSalary} - ${job.maxSalary}${type}`;
    if (job.minSalary) return `From ${symbol}${job.minSalary}${type}`;
    if (job.maxSalary) return `Up to ${symbol}${job.maxSalary}${type}`;
    return 'Not Disclosed';
  }
  
  const formatDate = (dateString, fallbackDateString, secondFallback) => {
    const dateToUse = dateString || fallbackDateString || secondFallback;
    if (!dateToUse) return 'N/A';
    return new Date(dateToUse).toLocaleDateString();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div> 
          <h2 className="page-title">Job Post Approvals</h2>
          <span className="muted">Viewing all job listings</span>
        </div>
        <div> 
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && !isDeleteModalOpen && ( // Only show page error if delete modal isn't open
        <div className="card empty" style={{ color: 'red', borderColor: 'red' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="card empty">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="card empty">No jobs found.</div>
      ) : (
        <div className="card">
          <table className="job-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Type</th>
                <th>Posted</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr key={job._id || job.id || i} className="job-row">
                  <td>{job.title || job.jobTitle || '—'}</td>
                  <td>{job.companyName || job.company || (job.employer && job.employer.companyName) || '—'}</td>
                  <td>{job.location || job.city || '—'}</td>
                  <td>{job.jobType || job.type || '—'}</td>
                  <td>{formatDate(job.postedAt, job.createdAt, job.created)}</td>
                  <td>
                    <div className="job-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => handleView(job)}>View</button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(job)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- VIEW JOB MODAL --- */}
      {isModalOpen && selectedJob && (
        <div className="job-modal-backdrop" onClick={closeModal}>
          <div className="job-modal" onClick={e => e.stopPropagation()}>
            <div className="job-modal-header">
              <h3>{selectedJob.title || 'Job Details'}</h3>
              <button className="job-modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="job-modal-body">
              {/* ... (all the job details) ... */}
              <h4>Job Details</h4>
              <div className="job-modal-grid">
                <p>
                  <strong>Company:</strong> {
                    selectedJob.companyName || 
                    selectedJob.company || 
                    (selectedJob.employer && selectedJob.employer.companyName) || 
                    'N/A'
                  }
                </p>
                <p>
                  <strong>Location:</strong> {selectedJob.location || selectedJob.city || 'N/A'}
                </p>
                <p>
                  <strong>Job Type:</strong> {selectedJob.jobType || selectedJob.type || 'N/A'}
                </p>
                <p>
                  <strong>Salary:</strong> {formatSalary(selectedJob)}
                </p>
                <p>
                  <strong>Status:</strong> {selectedJob.status || 'N/A'}
                </p>
                <p>
                  <strong>Posted On:</strong> {
                    formatDate(selectedJob.postedAt, selectedJob.createdAt, selectedJob.created)
                  }
                </p>
                <p>
                  <strong>Application Deadline:</strong> {formatDate(selectedJob.applicationDeadline, selectedJob.deadline)}
                </p>
                <p>
                  <strong>Experience Level:</strong> {selectedJob.experienceLevel || 'N/A'}
                </p>
                <p>
                  <strong>Education Level:</strong> {selectedJob.educationLevel || 'N/A'}
                </p>
              </div>

              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <>
                  <hr />
                  <h4>Required Skills</h4>
                  <div className="job-modal-skills">
                    {selectedJob.skills.map(skill => <span key={skill} className="job-skill-badge">{skill}</span>)}
                  </div>
                </>
              )}

              {selectedJob.employer && (
                <>
                  <hr />
                  <h4>Employer Details</h4>
                  <div className="job-modal-grid">
                    <p>
                      <strong>Company:</strong> {selectedJob.employer.companyName || 'N/A'}
                    </p>
                    <p>
                      <strong>Contact:</strong> {selectedJob.employer.ownerName || 'N/A'}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedJob.employer.ownerEmail || 'N/A'}
                    </p>
                    <p>
                      <strong>Website:</strong> {selectedJob.employer.companyWebsite ? <a href={selectedJob.employer.companyWebsite} target="_blank" rel="noopener noreferrer">{selectedJob.employer.companyWebsite}</a> : 'N/A'}
                    </p> 
                  </div>
                </>
              )}

              <hr />
              <h4>Job Description</h4>
              <div
                className="job-description"
                dangerouslySetInnerHTML={{ __html: selectedJob.description || 'No description available.' }}
              />
            </div>

            <div className="job-modal-footer">
              <button className="btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD THIS DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && jobToDelete && (
        <div className="job-modal-backdrop" onClick={closeDeleteModal}>
          <div className="job-modal job-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="job-modal-header">
              <h3>Delete Job Post</h3>
              <button className="job-modal-close" onClick={closeDeleteModal}>&times;</button>
            </div>
            <div className="job-modal-body">
              <p>Are you sure you want to permanently delete this job post?</p>
              <p className="job-delete-title">"{jobToDelete.title}"</p>
              {error && (
                <div className="job-delete-error">
                  Error: {error}
                </div>
              )}
            </div>
            <div className="job-modal-footer">
              <button className="btn" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}