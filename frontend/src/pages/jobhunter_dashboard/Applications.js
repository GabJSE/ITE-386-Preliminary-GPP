import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../../contexts/JobsContext';
import './Application.css';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { jobs: allJobs = [] } = useJobs() || {};
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Note: This component renders the current user's applications.
  // Data flow summary:
  // - On mount we fetch applications for the logged-in user from the backend
  // - Applications may contain a nested `job` object or only a `jobId`.
  // - To display the same metadata as SavedJobs (title, company, posted, deadline, location)
  //   we attempt to resolve a job object from JobsContext when only an id is present.
  // - Withdraw removes the application from the backend and updates local state so neither
  //   the jobseeker nor employer will see the application any longer.

  // Confirm withdraw: attempts to delete application on backend, falls back to local removal
  // confirmWithdraw: called when the user confirms they want to withdraw an application.
  // It attempts to delete the application on the backend and, on success, removes the
  // application from local state so the UI updates immediately.
  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    // support multiple possible id fields coming from backend
    const id = withdrawTarget._id || withdrawTarget.id || withdrawTarget.applicationId || withdrawTarget.application_id || '';
    if (!id) {
      alert('Unable to determine application id to withdraw');
      return;
    }
    setWithdrawing(true);
    try {
      const token = localStorage.getItem('token');
      // use the same API host used by fetchApplications to avoid mixed relative/absolute issues in dev
      const apiBase = (window.__API_BASE__ || 'http://localhost:5000').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json'
        }
      });

      // Treat success (2xx) or 404 (not found) as removed locally — backend may not implement delete in some dev setups
      if (res.ok || res.status === 404) {
        setApplications(prev => prev.filter(x => String(x._id || x.id) !== String(id)));
        setWithdrawModalOpen(false);
        setWithdrawTarget(null);
        // notify user
        try { window && window.toast && window.toast('Application withdrawn'); } catch (e) {}
        return;
      }

      // otherwise attempt to get error body
      let text = await res.text();
      try { const j = JSON.parse(text); text = j.error || j.message || JSON.stringify(j); } catch (e) {}
      throw new Error(text || `Server returned ${res.status}`);
    } catch (err) {
      console.error('Withdraw failed', err);
      alert('Failed to withdraw application: ' + (err.message || String(err)));
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    // fetchApplications: loads applications for the current user.
    // - expects an endpoint that returns { applications: [...] }
    // - stores the result in `applications` state for rendering
    const fetchApplications = async () => {
      try {
        // get stored auth info
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!userId) {
          console.warn('No userId found in localStorage');
          setLoading(false);
          return;
        }

        const res = await fetch(`http://localhost:5000/api/applications/applicant/${userId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        const data = await res.json();
        console.log('Fetched applications:', data);

        // If the API returns an applications array, set it to state. Otherwise log a warning.
        if (res.ok && data.applications) {
          setApplications(data.applications);
        } else {
          console.warn('No applications found or error:', data);
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);
  const hasApps = applications && applications.length > 0;

  // normalize application status field and compute counts for status pills
  const statuses = ['All', 'Hired', 'Rejected'];
  const getAppStatus = (a) => {
    if (!a) return '';
    const s = a.status || a.applicationStatus || a.application_status || a.outcome || a.stage || a.result || '';
    return (typeof s === 'string' ? s.toLowerCase() : String(s || '').toLowerCase());
  };

  const counts = useMemo(() => {
    const map = { All: 0, Hired: 0, Rejected: 0 };
    if (!applications || applications.length === 0) return map;
    map.All = applications.length;
    for (const a of applications) {
      const s = getAppStatus(a);
      if (s === 'hired' || s === 'offer' || s === 'accepted') map.Hired += 1;
      if (s === 'rejected' || s === 'declined') map.Rejected += 1;
    }
    return map;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    if (selectedStatus === 'All') return applications;
    return applications.filter(a => {
      const s = getAppStatus(a);
      if (selectedStatus === 'Hired') return (s === 'hired' || s === 'offer' || s === 'accepted');
      if (selectedStatus === 'Rejected') return (s === 'rejected' || s === 'declined');
      return false;
    });
  }, [applications, selectedStatus]);

  if (loading) {
    return (
      <div className="applications-root page-content" style={{ padding: 24 }}>
        <p>Loading your applications...</p>
      </div>
    );
  }

  return (
    <div className="applications-root page-content" style={{ padding: 24 }}>
      <div className="applications-header">
        <div className="applications-actions">
          <label className="sort-label">Sort by:</label>
          {/* <select className="wc-select">
            <option>Newest</option>
            <option>Oldest</option>
          </select> */}
              <div className="saved-tabs status-pills">
                {['All','Hired', 'Rejected'].map((s) => (
                  <button
                    key={s}
                    className={`saved-tab${selectedStatus === s ? ' active' : ''}`}
                    onClick={() => setSelectedStatus(s)}
                    type="button"
                  >
                    {s}
                    {/** badge showing count for this status */}
                    {counts[s] > 0 && <span className="saved-tab-badge">{counts[s] > 99 ? '99+' : counts[s]}</span>}
                  </button>
                ))}
              </div>
        </div>
      </div>

      {hasApps ? (
        <div className="applications-list">
          {filteredApplications.map((a, i) => {
            // Per-application normalization and metadata resolution:
            // - `a.job` may contain the nested job object, or the application may only store a `jobId`.
            // - When only an id is present we attempt to resolve the job from `JobsContext` so the
            //   UI shows the same fields SavedJobs displays (title/company/location/...).
            let job = a.job || (a.jobId ? { id: a.jobId } : null) || null;
            const jobId = (job && (job.id || job._id)) ? (job.id || job._id) : (a.jobId || a.job || '');
            if ((!job || (!job.title && !job.company)) && jobId) {
              const resolved = allJobs.find(j => String(j.id || j._id) === String(jobId));
              if (resolved) job = { ...resolved, ...job };
            }

            // Date applied may be stored under different field names depending on the API
            const dateApplied = a.applicationDate ? new Date(a.applicationDate).toLocaleDateString() : (a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '');

            // Provide sensible fallbacks for location/posted/deadline using either job or application fields
            const locationVal = (job && (job.location || job.city || job.region)) || a.location || a.city || a.region || '';
            const postedRaw = (job && (job.postedAt || job.posted)) || a.postedAt || a.jobPostedAt || null;
            const posted = postedRaw ? new Date(postedRaw).toLocaleDateString() : null;
            const deadlineRaw = (job && (job.deadline || job.applicationDeadline)) || a.deadline || a.applicationDeadline || null;
            const deadline = deadlineRaw ? new Date(deadlineRaw).toLocaleDateString() : null;

            return (
              <div key={a._id || i} className="saved-item">
                <div className="saved-card">
                  <div className="saved-left">
                    <div className="saved-avatar">
                      { (a.logoUrl || (job && job.logoUrl) || a.companyLogo) ? (
                        <img src={a.logoUrl || (job && job.logoUrl) || a.companyLogo} alt={a.companyName || a.jobTitle || (job && job.company) || 'Company'} />
                      ) : (
                        <div className="avatar-placeholder">{(a.companyName||'').slice(0,1)}</div>
                      )}
                    </div>
                  </div>

                  <div className="saved-center">
                    <div className="saved-row">
                    <div className="saved-title">{a.jobTitle || (job && job.title) || '—'}</div>

                    <div className="saved-badges">
                      {/* Job type */}
                      {(job && job.type) ? <span className="badge">{job.type}</span> : (a.jobType ? <span className="badge">{a.jobType}</span> : null)}

                      {/* Chop badge (always shown) */}
                      {/* <span className="chop-badge">Chop</span> */}

                      {/* Status badge */}
                      {(() => {
                        const s = getAppStatus(a);
                        if (s === 'hired' || s === 'offer' || s === 'accepted')
                          return <span className="status-pill interview">Hired</span>;
                        if (s === 'rejected' || s === 'declined')
                          return <span className="status-pill rejected">Rejected</span>;
                        return <span className="status-pill pending">Pending</span>;
                      })()}
                    </div>
                  </div>


                    <div className="saved-company">{a.companyName || (job && job.company) || '—'}</div>

                    <div className="saved-meta-row">
                      { locationVal && <span className="saved-location">{locationVal}</span> }
                      {posted && <span className="meta-sep">•</span>}
                      {posted && <span className="saved-posted">Posted: {posted}</span>}
                    </div>

                    <div className="saved-dates">
                      {dateApplied && <span className="date-saved">Date applied: {dateApplied}</span>}
                      {deadline && <span className="deadline">Deadline: {deadline}</span>}
                    </div>
                  </div>

                  <div className="saved-right">
                    <button className="wc-btn wc-btn-outline" onClick={() => { setWithdrawTarget(a); setWithdrawModalOpen(true); }} aria-label="Withdraw">Withdraw</button>

                    <button className="wc-btn wc-btn-outline" onClick={() => {
                      if (!jobId) { console.warn('Could not determine job id from application', a); navigate('/jobhunter/jobs'); return; }
                      navigate(`/jobhunter/jobs?jobId=${encodeURIComponent(jobId)}`);
                    }} aria-label="View details">View details</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="applications-empty">
          <div className="empty-card">
            <div className="empty-illustration" aria-hidden />
            <div>
              <p className="empty-text">
                You haven't applied for any jobs yet. Start exploring opportunities on the{' '}
                <strong>Job Search</strong> page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw confirmation modal */}
      {withdrawModalOpen && withdrawTarget && (
        <div
          className="wc-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !withdrawing) { setWithdrawModalOpen(false); setWithdrawTarget(null); } }}
        >
          <div className="wc-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
            <div className="modal-header">
              <h3 id="withdraw-title">Withdraw application</h3>
              {/* <button className="wc-btn wc-btn-outline" onClick={() => { if (!withdrawing) { setWithdrawModalOpen(false); setWithdrawTarget(null); } }}>Close</button> */}
            </div>
            <div>
              <p style={{ color: '#444' }}>
                Are you sure you want to withdraw your application for <strong>{withdrawTarget.jobTitle || 'this job'}</strong><strong>{withdrawTarget.companyName || withdrawTarget.employerName || ''}</strong>?
                This action will remove your application from your applications list.
              </p>
            </div>
            <div className="modal-actions">
              <button className="wc-btn wc-btn-outline" onClick={() => { if (!withdrawing) { setWithdrawModalOpen(false); setWithdrawTarget(null); } }}>Cancel</button>
              <button className="wc-btn wc-btn-danger" onClick={confirmWithdraw} disabled={withdrawing}>{withdrawing ? 'Withdrawing...' : 'Withdraw application'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
