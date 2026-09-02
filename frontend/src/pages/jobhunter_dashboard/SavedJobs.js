import React, { useMemo, useState, useEffect } from 'react';
import { useJobs } from '../../contexts/JobsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApplicantApplications } from '../../api/applications';
import './SavedJobs.css';

export default function SavedJobs() {
  const { jobs, savedJobs, savedJobIds, toggleSave } = useJobs();
  const navigate = useNavigate();
  const { profile, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  // join job metadata with saved info (savedAt)

  // derive list with job metadata merged in
  const savedList = savedJobs.map(s => {
    const job = jobs.find(j => String(j.id || j._id) === String(s.id));
    return { ...s, job };
  }).filter(x => x.job);

  // helper to determine expired / active / applied
  const now = new Date();
  const categorized = useMemo(() => {
    return savedList.map(item => {
      const job = item.job || {};
      const expDate = job.expirationDate || job.applicationDeadline || job.deadline;
      // consider explicit status from backend as authoritative (Closed),
      // or fallback to expiration/application/deadline timestamps
      const statusClosed = job.status && String(job.status).toLowerCase() === 'closed';
      const isClosed = statusClosed || (expDate ? (new Date(expDate) < now) : false);

      // determine if current user has applied to the job — handle many backend shapes
      const uid = userId || (profile && (profile._id || profile.id || profile.userId));
      const email = profile && profile.email;
      let isApplied = false;
      try {
        if (job) {
          if (job.applied || job.userApplied || job.appliedByCurrentUser || job.hasApplied || job.has_applied || job.hasAppliedByCurrentUser || job.has_applied_by_current_user) isApplied = true;
          const status = job.applicationStatus || job.application_status || job.status || '';
          if (!isApplied && typeof status === 'string' && status.toLowerCase() === 'applied') isApplied = true;

          // If we have a server-provided list of applications for this user, consult it (most reliable)
          const jobKey = job.id || job._id || job.jobId || '';
          if (!isApplied && jobKey && appliedJobIds && appliedJobIds.has(String(jobKey))) {
            isApplied = true;
          }

          // look for application lists on the job record
          const apps = job.applications || job.applicants || job.applicationsList || job.applications_list || job.applications_by || null;
          if (!isApplied && Array.isArray(apps) && apps.length > 0 && (uid || email)) {
            for (const a of apps) {
              if (!a) continue;
              if (uid && (String(a.applicantId || a.userId || a.user || a.ownerId || a.applicant || a._id) === String(uid))) { isApplied = true; break; }
              if (email && (String(a.email || a.applicantEmail || a.applicant_email || a.ownerEmail) === String(email))) { isApplied = true; break; }
              if (uid && a.applicant && String(a.applicant) === String(uid)) { isApplied = true; break; }
            }
          }
        }
      } catch (e) {
        isApplied = !!job.applied;
      }

      return { ...item, isClosed, isApplied };
    });
  }, [savedList, now, userId, profile]);

  // load applications for the current user so we can reliably mark saved jobs as applied
  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      try {
        const uid = userId || (profile && (profile._id || profile.id || profile.userId));
        if (!uid) {
          if (mounted) setAppliedJobIds(new Set());
          return;
        }
        const res = await getApplicantApplications(uid);
        const apps = Array.isArray(res) ? res : (res && res.applications) || [];
        const ids = new Set();
        for (const a of apps) {
          if (!a) continue;
          const jobId = a.jobId || a.job || a.job_id || a.jobId || a.jobId || (a.job && (a.job._id || a.job.id));
          if (jobId) ids.add(String(jobId));
        }
        if (mounted) setAppliedJobIds(ids);
      } catch (err) {
        // ignore errors — we'll fall back to job-local signals
        if (mounted) setAppliedJobIds(new Set());
      }
    }
    loadApps();
    return () => { mounted = false; };
  }, [userId, profile]);

  const visible = useMemo(() => {
    switch (activeTab) {
      // Active now includes any job that is not closed (this allows applied jobs to appear
      // in both Active and Applied views and therefore show badges on both tabs)
      case 'Active': return categorized.filter(i => !i.isClosed);
      case 'Closed': return categorized.filter(i => i.isClosed);
      case 'Applied': return categorized.filter(i => i.isApplied);
      default: return categorized;
    }
  }, [activeTab, categorized]);

  // counts for tabs
  const counts = useMemo(() => ({
    All: categorized.length,
    // Active counts include any non-closed job (may also be applied)
    Active: categorized.filter(i => !i.isClosed).length,
    Closed: categorized.filter(i => i.isClosed).length,
    Applied: categorized.filter(i => i.isApplied).length,
  }), [categorized]);

  // notify user about saved jobs that have newly passed their deadline
  useEffect(() => {
    try {
      const key = 'wc_notified_closed_saved_jobs';
      const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
  const newlyClosed = categorized.filter(i => i.isClosed && !seen.includes(String(i.id)));
      if (newlyClosed.length > 0) {
        newlyClosed.forEach(i => {
          const job = i.job || {};
          const id = i.id || job.id || job._id;
          const title = job.title || 'Saved job';
          const message = `The job "${title}" you saved has passed its deadline and is now closed.`;
          try {
            window.dispatchEvent(new CustomEvent('wc:notification', { detail: { title: 'Saved job closed', message, jobId: id } }));
          } catch (e) {
            console.warn('Failed to dispatch wc:notification', e);
          }
          seen.push(String(i.id));
        });
        sessionStorage.setItem(key, JSON.stringify(seen));
      }
    } catch (e) {
      // ignore errors from storage or dispatch
    }
  }, [categorized]);

  return (
    <div className="saved-jobs-root">
      {/* <div className="saved-header">
        <div>
          <h1 className="saved-jobs-title">My Saved Jobs</h1>
          <p className="saved-subtitle">Revisit jobs you've bookmarked for later.</p>
        </div>
      </div> */}

      <div className="saved-tabs">
        <label className="sort-label">Sort by:</label>
        {['All', 'Active', 'Closed', 'Applied'].map(t => (
          <button key={t} className={`saved-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
            {counts[t] > 0 && <span className={`saved-tab-badge`}>{counts[t] > 99 ? '99+' : counts[t]}</span>}
          </button>
        ))}
      </div>

      {/* Notify user about saved jobs that have newly passed their deadline (track in sessionStorage to avoid repeated alerts) */}
      {/** this side-effect only dispatches a DOM CustomEvent 'wc:notification' so any notification UI can pick it up */}
      {useEffect(() => {
        try {
          const key = 'wc_notified_closed_saved_jobs';
          const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
          const newlyClosed = categorized.filter(i => i.isClosed && !seen.includes(String(i.id)));
          if (newlyClosed.length > 0) {
            newlyClosed.forEach(i => {
              const job = i.job || {};
              const id = i.id || job.id || job._id;
              const title = job.title || 'Saved job';
              const message = `The job "${title}" you saved has passed its deadline and is now closed.`;
              try {
                window.dispatchEvent(new CustomEvent('wc:notification', { detail: { title: 'Saved job closed', message, jobId: id } }));
              } catch (e) {
                console.warn('Failed to dispatch wc:notification', e);
              }
              seen.push(String(i.id));
            });
            sessionStorage.setItem(key, JSON.stringify(seen));
          }
        } catch (e) {
          // ignore errors from storage or dispatch
        }
      }, [categorized])}

      {visible.length === 0 ? (
        <div className="saved-empty-wrap">
          <p className="saved-empty">You have no saved jobs in this view.</p>
        </div>
      ) : (
        <div className="saved-list">
          {visible.map(item => {
            const job = item.job;
            const dateSaved = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : null;
            const posted = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : null;
            const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString() : null;

            const jobId = job.id || job._id || item.id;

            return (
              <div key={item.id} className="saved-item">
                <div className="saved-card">
                  <div className="saved-left">
                    <div className="saved-avatar">
                      {job.logoUrl ? <img src={job.logoUrl} alt={job.company} /> : <div className="avatar-placeholder" />}
                    </div>
                  </div>

                  <div className="saved-center">
                    <div className="saved-row">
                      <div className="saved-title">{job.title}</div>
                      <div className="saved-badges">
                        {job.type && <span className="badge">{job.type}</span>}
                      </div>
                    </div>

                    <div className="saved-company">{job.company}</div>

                    <div className="saved-meta-row">
                      <span className="saved-location">{job.location}</span>
                      {posted && <span className="meta-sep">•</span>}
                      {posted && <span className="saved-posted">Posted: {posted}</span>}
                    </div>

                    <div className="saved-dates">
                      {dateSaved && <span className="date-saved">Date saved: {dateSaved}</span>}
                      {deadline && <span className="deadline">Deadline: {deadline}</span>}
                    </div>
                  </div>

                  <div className="saved-right">
                    <button className="wc-btn wc-btn-outline" onClick={() => navigate(`/jobhunter/jobs?jobId=${encodeURIComponent(jobId)}`)} aria-label="View details">View details</button>

                    {/* <button className="wc-btn wc-btn-apply" onClick={() => {
                      // navigate to Jobs page and request opening the apply modal via location.state
                      if (jobId) {
                        navigate(`/jobhunter/jobs?jobId=${encodeURIComponent(jobId)}`, { state: { jobId, openApply: true } });
                      } else {
                        console.warn('No job id to navigate to');
                      }
                    }} aria-label="Apply now">Apply Now</button> */}

                    <button className="wc-btn wc-btn-outline" onClick={() => toggleSave(item.id)} aria-label="Remove">Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
