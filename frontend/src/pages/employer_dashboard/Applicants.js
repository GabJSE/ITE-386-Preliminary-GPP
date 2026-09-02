import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getEmployerApplications, getApplication } from '../../api/applications';
import { getOwnProfile } from '../../api/profile';
import './Applicants.css';
import { sendNotification } from '../../api/notifications';
import { notifyUser } from '../../utils/notifyUser';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import { hireApplicant } from '../../api/applications';



export default function Applicants() {
  const { profile, userId, token } = useAuth();
  function getApplicantId(a) {
  if (!a) return null;
  let id = a.applicantId || a.userId || a._id || a.candidateId || null;
  if (id && typeof id === 'object') id = id._id || id.id || id.userId || id.email || null;
  return id ? String(id) : null;
}

  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalApp, setModalApp] = useState(null);
  // hold the id of the application that's currently loading (view or status change)
  const [loadingAppId, setLoadingAppId] = useState(null);
  const [appError, setAppError] = useState(null);
  const [statusMap, setStatusMap] = useState({}); // applicationId -> status ('rejected','hired')
  const [notesMap, setNotesMap] = useState({}); // applicationId -> notes string
  const [notesOpenFor, setNotesOpenFor] = useState(null);
  const [scheduleMap, setScheduleMap] = useState({}); // applicationId -> datetime string
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Document Preview Modal State 
const [previewOpen, setPreviewOpen] = useState(false);
const [previewUrlState, setPreviewUrlState] = useState('');
const [previewTitle, setPreviewTitle] = useState('');

  // --- NEW STATE FOR HIRING MODAL ---
  const [applicantToHire, setApplicantToHire] = useState(null);


  // close on escape key
  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setModalOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  useEffect(() => {
    // prefer profile.userId/_id but fall back to top-level userId from AuthContext if available
    const employerId = (profile && (profile.userId || profile._id)) || userId || null;
    if (!employerId) return;
    // load all applications for this employer and derive jobs list, then merge with posted jobs
  // Note: If AuthContext provides a separate userId (e.g. from login), use it — some consumers expect it at top-level
  // However this component only receives `profile` from useAuth; if needed, consider reading useAuth().userId directly.
    async function load() {
      try {
        const d = await getEmployerApplications(employerId);
        const applications = d.applications || [];
        setApps(applications);

        const initialMap = {};
          applications.forEach(a => {
          if (a.status) initialMap[a._id] = a.status;
          });
          setStatusMap(initialMap);

        // derive job counts from applications
        const jobMap = {};
        applications.forEach(a => {
          const jid = a.jobId || 'unknown';
          jobMap[jid] = jobMap[jid] || { jobId: jid, title: a.jobTitle || 'Untitled', count: 0 };
          jobMap[jid].count += 1;
        });

        // fetch all jobs and merge titles / include jobs with zero applicants
        try {
          const base = process.env.REACT_APP_API_BASE || '';
          const res = await fetch(`${base}/api/jobs?createdBy=${encodeURIComponent(employerId)}`);
          if (res.ok) {
            const allJobs = await res.json();
            allJobs.forEach(j => {
              const jid = j._id;
              if (!jobMap[jid]) jobMap[jid] = { jobId: jid, title: j.title || 'Untitled', count: 0, logoUrl: j.logoUrl || j.logo || null };
              else {
                jobMap[jid].title = j.title || jobMap[jid].title;
                jobMap[jid].logoUrl = jobMap[jid].logoUrl || j.logoUrl || j.logo || null;
              }
            });
          }
          // if no jobs were returned for this createdBy, try fetching all jobs and match by company
          if (Object.keys(jobMap).length === 0) {
            try {
              const res2 = await fetch(`${base}/api/jobs`);
              if (res2.ok) {
                const all = await res2.json();
                all.forEach(j => {
                  const jid = j._id || j.id || 'unknown-' + (j.title || '') + String(Math.random()).slice(2,8);
                  // include if createdBy matches OR no createdBy and company matches profile.company
                  if (j.createdBy && String(j.createdBy) === String(employerId)) {
                    if (!jobMap[jid]) jobMap[jid] = { jobId: jid, title: j.title || 'Untitled', count: 0, logoUrl: j.logoUrl || j.logo || null };
                  } else if (!j.createdBy && profile && profile.company && String((j.company||'').trim()).toLowerCase() === String((profile.company||'').trim()).toLowerCase()) {
                    if (!jobMap[jid]) jobMap[jid] = { jobId: jid, title: j.title || 'Untitled', count: 0, logoUrl: j.logoUrl || j.logo || null };
                  }
                });
              }
            } catch (e) {
              console.warn('Fallback fetch all jobs failed', e);
            }
          }
        } catch (e) {
          // ignore job fetch errors; we still have job list derived from applications
          console.warn('Could not fetch jobs to merge with applications', e);
        }

        const jobList = Object.values(jobMap);
        setJobs(jobList);
        setSelectedJobId(s => s || (jobList[0] && jobList[0].jobId));
      } catch (e) {
        console.error('Error loading employer applications/jobs', e);
      }
    }
    load();
  }, [profile, userId]);
  

const getAbsoluteUrl = (url) => {
  try {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return window.location.protocol + url;
    const path = url.startsWith('/') ? url : '/' + url;
    return window.location.origin + path;
  } catch (e) {
    console.error('getAbsoluteUrl failed', e);
    return url;
  }
};

// Function to open the preview modal
const openDocumentPreview = (url, title) => {
  const absoluteUrl = getAbsoluteUrl(url);
  if (!absoluteUrl) return;
  setPreviewUrlState(absoluteUrl);
  setPreviewTitle(title);
  setPreviewOpen(true);
};

// Add this inside the component, before return()
function handleExport() {
  if (!filtered.length) {
    alert('No applicants to export.');
    return;
  }

  // Headers required
  const headers = [
    'Full Name',
    'Email',
    'Status',
    'Application Date',
    'Job Title'
  ];

  // Build CSV rows
  const rows = filtered.map(a => [
    a.fullName || '',
    a.email || '',
    a.status || '',
    new Date(a.applicationDate || a.createdAt).toLocaleDateString(),
    a.jobTitle || ''
  ]);

  // Combine to CSV
  const csvContent =
    [headers, ...rows]
      .map(r =>
        r.map(v =>
          `"${String(v || '').replace(/"/g, '""')}"`
        ).join(',')
      ).join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Applicants_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}



  // helper to call backend to update application status
  async function updateApplicationStatus(appId, status) {
    if (!appId) return;
    const apiBase = process.env.REACT_APP_API_BASE || '';
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`${apiBase}/api/applications/${encodeURIComponent(appId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to update');
      }
      const json = await res.json();

      // update local apps state: set the updated application's status
      setApps(prev => prev.map(a => (String(a._id) === String(appId) ? { ...a, status } : a)));

      // if backend indicates job was filled, update jobs list and mark other applicants rejected
      if (json && json.jobFilled) {
        // mark other applications for the job as rejected in local state
        const rejectedIds = json.rejectedIds || [];
        setApps(prev => prev.map(a => (rejectedIds.includes(a._id) ? { ...a, status: 'rejected' } : a)));

        // move job out of active jobs list (basic approach: remove it from jobs array)
        setJobs(prev => prev.filter(j => String(j.jobId) !== String((json.application && json.application.jobId) || '')));
        // optionally show a toast or alert
        try { window && window.toast && window.toast('Job marked filled — other applicants were rejected'); } catch (e) { /* ignore */ }
      }

      return json;
    } catch (e) {
      console.error('Failed to update application status', e);
      alert('Failed to update status: ' + (e && e.message ? e.message : String(e)));
      throw e;
    }
  }

  const filtered = apps.filter(a => {
  const jobMatch = selectedJobId ? (a.jobId || 'unknown') === selectedJobId : true;
  const status = (a.status || '').toLowerCase();
  const text = searchTerm.toLowerCase();

  const matchesSearch =
    !text ||
    (a.fullName && a.fullName.toLowerCase().includes(text)) ||
    (a.email && a.email.toLowerCase().includes(text)) ||
    (Array.isArray(a.skills) && a.skills.join(' ').toLowerCase().includes(text));

  if (activeTab === 'All') return jobMatch && matchesSearch;
  if (activeTab === 'Hired') return jobMatch && status === 'hired' && matchesSearch;
  if (activeTab === 'Rejected') return jobMatch && status === 'rejected' && matchesSearch;
  return jobMatch && matchesSearch;
});


  // --- NEW FUNCTION TO CONFIRM HIRE AND OPEN MODAL ---
  function confirmHire(applicant) {
    const currentStatus = String(applicant.status || '').toLowerCase();

    if (currentStatus === 'hired') {
      try { window.toast?.('This applicant is already hired.', { type: 'info' }); } catch(e) {}
      return;
    }

    setApplicantToHire(applicant);
  }

  // --- NEW FUNCTION CONTAINING THE ASYNC HIRE LOGIC ---
  async function performHire() {
    if (!applicantToHire) return;
    const a = applicantToHire;
    
    // Close the modal immediately
    setApplicantToHire(null); 

    try {
      setLoadingAppId(a._id);

      // 1. Update backend status
      const resp = await updateApplicationStatus(a._id, 'hired');

      // 2. Send hire notification to applicant
      try {
        const applicantId = a.applicantId || a.userId || a._id;
        if (applicantId) {
          await notifyUser(token, {
            userId: applicantId,
            userType: 'Profile',
            type: 'application',
            title: '🎉 Congratulations!',
            message: `You have been hired for "${a.jobTitle || 'this position'}"! Please wait for final instructions.`,
          });
        }
      } catch (err) {
        console.error('Failed to send hire notification:', err);
      }

      // 3. Update local state
      setStatusMap(prev => ({ ...prev, [a._id]: 'hired' }));
      setApps(prev => prev.map(x => (x._id === a._id ? { ...x, status: 'hired' } : x)));

      // 4. Handle job filled logic (reject other applicants & remove job from list)
      if (resp?.jobFilled) {
        const rejectedIds = resp.rejectedIds || [];
        if (rejectedIds.length) {
          setApps(prev => prev.map(x => (rejectedIds.includes(x._id) ? { ...x, status: 'rejected' } : x)));
        }
        setJobs(prev => prev.filter(j => String(j.jobId) !== String(resp.application?.jobId || '')));
        try { window.toast?.('Position filled — other applicants have been marked rejected.', { type: 'success' }); } catch(e) {}
      } else {
        try { window.toast?.('Applicant has been marked as hired.', { type: 'success' }); } catch(e) {}
      }

    } catch (e) {
      console.error('Failed to hire applicant:', e);
      try { window.toast?.('Failed to hire applicant. See console for details.', { type: 'error' }); } catch(e) {}
    } finally {
      setLoadingAppId(null);
    }
  }


  

  return (
    <div className="employer-applicants-root">
      <div className="card job-posts">
        <div className="card-header">
          <h3>Job Posts</h3>
          <input
  className="wc-search"
  placeholder="Search applicants..."
  value={searchTerm}
  onChange={e => setSearchTerm(e.target.value)}
/>

        </div>
        <div className="card-body list-body">
          {jobs.length === 0 ? <div className="empty">No job posts yet</div> : (
            jobs.map(j => (
              <div key={j.jobId} className={`job-item ${selectedJobId === j.jobId ? 'active' : ''}`} onClick={() => setSelectedJobId(j.jobId)}>
                <div className="job-item-left">
                  <div className="job-avatar">
                    { j.logoUrl ? <img src={j.logoUrl} alt={`${j.title || 'Job'} logo`} /> : null }
                  </div>
                </div>
                <div className="job-item-body">
                  <div className="job-title">{j.title}</div>
                  <div className="job-meta">Applicants: {j.count}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card applicants-panel">
        <div className="card-header">
          <h3>Applicants for {jobs.find(j=>j.jobId===selectedJobId)?.title || 'All Jobs'}</h3>
          <div className="header-actions">
            <button className="wc-btn" onClick={handleExport}>Export Applicants</button>
          </div>
        </div>
        <div className="card-body applicants-body">
          <div className="filters-row">
            <input className="wc-search" placeholder="Search" />
            <div className="tabs">
  {['All', 'Hired', 'Rejected'].map(t => (
    <button
      key={t}
      className={`tab ${activeTab === t ? 'active' : ''}`}
      onClick={() => setActiveTab(t)}
    >
      {t}
    </button>
  ))}
</div>


            
          </div>

          



          <div className="applicants-grid">
            {filtered.length === 0 ? <div className="empty">No applicants yet</div> : (
              filtered.map(a => (
                <div key={a._id} className="app-card">
                  <div className="app-card-left"></div>
                  <div className="app-card-body">
                    <div className="app-name">{a.fullName}</div>
                    <div className="app-summary">{(a.skills || []).slice(0,3).join(', ')}</div>
                    <div className="app-meta">{"application date: " + new Date(a.applicationDate || a.createdAt).toLocaleDateString()}</div>
                    {statusMap[a._id] ? <span className="status-badge">{statusMap[a._id]}</span> : null}
                  </div>
                  <div className="app-card-actions">
                    <div className="app-actions">
                      <button className="wc-btn btn-view small" title="View Profile / Resume — review applicant qualifications" onClick={async () => {
                        setAppError(null);
                        setLoadingAppId(a._id);
                        try {
                          const res = await getApplication(a._id || a.applicationId || a.id);
                          const app = (res && res.application) ? res.application : res;
                          let profileData = null;
                          try {
                            const applicantId = app.applicantId || app.applicant || null;
                            const email = app.email || app.contactEmail || app.applicantEmail || null;
                            // pass the auth token when available so profile fetch can be authorized
                            // When fetching another user's profile by id/email, do NOT send the employer's token
                            // because the backend will interpret the token's userId as the requested profile and return the wrong record.
                            if (applicantId) profileData = await getOwnProfile(null, applicantId, null);
                            else if (email) profileData = await getOwnProfile(null, null, email);
                          } catch (pfErr) { console.debug('No profile record found for applicant', pfErr); }
                          const merged = Object.assign({}, app, profileData || {});
                          // Show applicant details in a modal for quick review
                          setModalApp(merged);
                          setModalOpen(true);
                        } catch (e) {
                          console.error('Failed to load application', e);
                          setAppError('Could not load profile');
                        } finally { setLoadingAppId(null); }
                        }}>{loadingAppId === a._id ? 'Loading…' : 'View'}</button>

                      <button className="wc-btn btn-message small" title="Message / Contact — communicate directly" onClick={() => {
                        // try several common fields for an identifier/email so Messages component can find or start a conversation
                        const email = a.email || a.contactEmail || a.applicantEmail || a.ownerEmail || modalApp?.email || null;
                        let applicantId = a.applicantId || a.applicant || a.userId || a.user || a._id || a.candidateId || null;
                        // normalize applicantId in case it's a populated object
                        if (applicantId && typeof applicantId === 'object') {
                          applicantId = applicantId._id || applicantId.id || applicantId.userId || applicantId.email || null;
                        }
                        if (!applicantId && !email) {
                          alert('No contact available to message.');
                          return;
                        }

                        // Pass multiple keys in location.state — Messages.js checks for toApplicantId, toEmail, toUserId
                        const state = { toName: a.fullName || a.name || '' };
                        if (applicantId) { state.toApplicantId = String(applicantId); state.toUserId = String(applicantId); }
                        if (email) state.toEmail = email;

                        // Navigate to employer messages — the Messages component will select or create the conversation
                        navigate('/employer/messages', { state });
                      }}>
                        Message
                      </button>

                      {/* Shortlist removed per request */}

                      <button className="wc-btn btn-reject" title="Reject / Decline — manage unqualified applicants" onClick={async () => {
                        try {
                          // derive current state and the status we want to set
                          const currentlyRejected = statusMap[a._id] === 'rejected';
                          const newStatus = currentlyRejected ? 'pending' : 'rejected';

                          // call backend to update status
                          await updateApplicationStatus(a._id, newStatus);

                          // Send notification to applicant
try {
  const applicantId = a.applicantId || a.userId || a._id;
if (applicantId) {
  await notifyUser(token, {
    userId: applicantId,
    userType: 'Profile', // ✅ job hunters always come from Profile model
    type: 'application',
    title: 'Application Update',
    message:
  newStatus === 'rejected'
    ? `We regret to inform you that your application in "${a.jobTitle || 'this position'}" was not successful.`
    : 'Your application status has been updated.',

  });
}



} catch (err) {
  console.error('Failed to send rejection notification:', err);
}



                          // update local maps consistently
                          setStatusMap(prev => ({ ...prev, [a._id]: currentlyRejected ? undefined : 'rejected' }));
                          setApps(prev => prev.map(x => x._id === a._id ? { ...x, status: newStatus } : x));
                        } catch (e) { /* handled by helper */ }
                      }}>{statusMap[a._id] === 'rejected' ? 'Rejected' : 'Reject'}</button>

                      {/* --- HIRE BUTTON CALLING CUSTOM CONFIRM FUNCTION --- */}
                      <button
                        className="wc-btn btn-hire"
                        title="Hire / Accept — finalize selection"
                        onClick={() => confirmHire(a)}
                        disabled={['hired', 'rejected'].includes(String(a.status || '').toLowerCase()) || loadingAppId === a._id}
                      >
                        {loadingAppId === a._id ? 'Saving…' : (String(a.status || '').toLowerCase() === 'hired' ? 'Hired' : 'Hire')}
                      </button>
                      {/* --- END HIRE BUTTON --- */}


                    </div>
                    
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => {
          if (e.target.classList && e.target.classList.contains('wc-modal-backdrop')) setModalOpen(false);
        }}>
          <div className="wc-modal resume-modal" role="document">
            <div className="modal-header">
              <h3>Applicant Profile</h3>
              <button className="secondary" onClick={() => setModalOpen(false)}>Close</button>
            </div>

            {appError && <div className="modal-error">{appError}</div>}

            <div className="wc-modal-body">
              {!modalApp ? (
                <div className="modal-loading">Loading profile…</div>
              ) : (
                <div className="resume-grid">
                  <aside className="resume-left">
                    <div className="resume-avatar">
                      { (modalApp.image || modalApp.profilePictureUrl) ? (
                        <img src={modalApp.image || modalApp.profilePictureUrl} alt="avatar" />
                      ) : (
                        <div className="avatar-initials">{(modalApp.fullName||modalApp.firstName||'U').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                      ) }
                    </div>

                    <div className="resume-name">{modalApp.fullName || `${modalApp.firstName || ''} ${modalApp.lastName || ''}`.trim()}</div>

                    <div className="resume-contact">
                      <div className="contact-line">{modalApp.email || modalApp.ownerEmail || '—'}</div>
                      <div className="contact-line">{modalApp.phone || modalApp.contactNumber || '—'}</div>
                      <div className="contact-line">{(modalApp.city || modalApp.stateprovince || modalApp.country) ? [modalApp.city, modalApp.stateprovince, modalApp.country].filter(Boolean).join(', ') : (modalApp.location || '—')}</div>
                    </div>

                    <div className="resume-links">
                      {/* {modalApp.linkedin && <a href={modalApp.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>} */}
                     {modalApp.resumeUrl && <button type="button" className="view-resume" onClick={() => openDocumentPreview(modalApp.resumeUrl, `${modalApp.fullName || 'Applicant'}'s Resume`)}>View resume</button>}
                    </div>

                    {/* Personal details below location: Gender, Nationality, DOB, Languages, Documents */}
                    <div className="resume-personal">
                      <div className="personal-line"><strong>Gender:</strong> {modalApp.gender || modalApp.sex || '—'}</div>
                      <div className="personal-line"><strong>Nationality:</strong> {modalApp.nationality || modalApp.countryOfOrigin || '—'}</div>
                      <div className="personal-line"><strong>Date of birth:</strong> {modalApp.dob || modalApp.dateOfBirth || modalApp.birthDate ? new Date(modalApp.dob || modalApp.dateOfBirth || modalApp.birthDate).toLocaleDateString() : '—'}</div>
                      <div className="personal-line"><strong>Languages:</strong> {Array.isArray(modalApp.languages) ? modalApp.languages.join(', ') : (modalApp.languages || '—')}</div>

                      {/* Documents: support several common shapes */}
                      <div className="personal-docs">
                      <strong>Documents:</strong>
                      {(() => {
                        const documentList = [];

                        // --- 1. Resume (File) ---
                        // Using schema field: resumeUrl
                        if (modalApp.resumeUrl) {
                          documentList.push(
                            <li key="resume">
                              <button type="button" className="document-link-btn" onClick={() => openDocumentPreview(modalApp.resumeUrl, `${modalApp.fullName || 'Applicant'}'s Resume`)}>
                                Resume
                              </button>
                            </li>
                          );
                        }

                        // --- 2. Letters of Recommendation (File) ---
                        // Using schema field: lettersOfRecommendation ([String] of URLs)
                        if (Array.isArray(modalApp.lettersOfRecommendation) && modalApp.lettersOfRecommendation.length) {
                          modalApp.lettersOfRecommendation.forEach((url, i) => {
                            const name = `Letter of Recommendation ${i + 1}`;
                            if (url) {
                              documentList.push(
                                <li key={`lor-${i}`}>
                                  <button type="button" className="document-link-btn" onClick={() => openDocumentPreview(url, name)}>
                                    {name} (PDF)
                                  </button>
                                </li>
                              );
                            }
                          });
                        }

                        // --- 3. Professional Certifications & Licenses (File) ---
                        // Using schema field: professionalLicenses ([String] of URLs)
                        if (Array.isArray(modalApp.professionalLicenses) && modalApp.professionalLicenses.length) {
                          modalApp.professionalLicenses.forEach((url, i) => {
                            const name = `Certification/License ${i + 1}`;
                            if (url) {
                              documentList.push(
                                <li key={`license-${i}`}>
                                  <button type="button" className="document-link-btn" onClick={() => openDocumentPreview(url, name)}>
                                    {name} (PDF)
                                  </button>
                                </li>
                              );
                            }
                          });
                        }

                        // --- 4. Certifications (Structured Links/Files) ---
                        // Using schema field: certifications ([{ name, url }])
                        if (Array.isArray(modalApp.certifications) && modalApp.certifications.length) {
                          modalApp.certifications.forEach((cert, i) => {
                            if (cert.url) {
                              const name = cert.name || `Certification ${i + 1}`;
                              // Assume documents/files open in modal, general links open in new tab
                              const isDocument = cert.url.match(/\.(pdf|doc|docx|png|jpg|jpeg|webp)$/i);
                              
                              if (isDocument) {
                                documentList.push(
                                  <li key={`cert-doc-${i}`}>
                                    <button type="button" className="document-link-btn" onClick={() => openDocumentPreview(cert.url, name)}>
                                      {name} (Certificate/Proof)
                                    </button>
                                  </li>
                                );
                              } else {
                                documentList.push(
                                  <li key={`cert-link-${i}`}>
                                    <a href={cert.url} target="_blank" rel="noreferrer">{name} (External Link)</a>
                                  </li>
                                );
                              }
                            }
                          });
                        }


                        // --- 5. Portfolio Links (External Link) ---
                        // Using schema field: portfolio ([String] of URLs)
                        if (Array.isArray(modalApp.portfolio) && modalApp.portfolio.length) {
                          modalApp.portfolio.forEach((url, i) => {
                            if (url) {
                              documentList.push(
                                <li key={`port-${i}`}>
                                  <a href={url} target="_blank" rel="noreferrer">{`Portfolio Link ${i + 1}`}</a>
                                </li>
                              );
                            }
                          });
                        }

                        // --- 6. GitHub/GitLab URL (External Link) ---
                        // Using schema field: githubUrl
                        if (modalApp.githubUrl) {
                          documentList.push(
                            <li key="github-link">
                              <a href={modalApp.githubUrl} target="_blank" rel="noreferrer">GitHub/GitLab Profile</a>
                            </li>
                          );
                        }

                        // --- 7. LinkedIn URL (External Link) ---
                        // Using schema field: linkedin
                        if (modalApp.linkedin) {
                          documentList.push(
                            <li key="linkedin-link">
                              <a href={modalApp.linkedin} target="_blank" rel="noreferrer">LinkedIn Profile</a>
                            </li>
                          );
                        }
                        
                        // --- 8. General/Other Documents (Fallback/Unstructured) ---
                        // This handles any documents in the older/generic fields, ensuring they are not duplicates
                        const allFiles = (modalApp.documents || []).concat(modalApp.files || []);
                        allFiles.forEach((doc, i) => {
                          const url = typeof doc === 'string' ? doc : (doc.url || doc.link || doc.fileUrl || doc.path);
                          const name = typeof doc === 'string' ? (doc.split('/').pop()) : (doc.name || doc.title || 'Other Document');
                          
                          // Check for duplicates based on URL
                          const isDuplicate = documentList.some(item => 
                            (item.props.children.props.onClick && item.props.children.props.onClick.toString().includes(url)) || 
                            (item.props.children.props.href === url)
                          );
                          
                          if (url && !isDuplicate) {
                            documentList.push(
                              <li key={`doc-${i}`}>
                                <button type="button" className="document-link-btn" onClick={() => openDocumentPreview(url, name)}>
                                  {name}
                                </button>
                              </li>
                            );
                          }
                        });


                        return documentList.length > 0 ? <ul>{documentList}</ul> : <div>—</div>;

                      })()}
                    </div>
                    </div>
                  </aside>

                  <main className="resume-main">
                    <section className="resume-section">
                      <h4 className="section-title">Summary</h4>
                      <div className="section-body">{modalApp.bio || modalApp.coverLetter || modalApp.companyDescription || '—'}</div>
                    </section>

                    <section className="resume-section">
                      <h4 className="section-title">Experience</h4>
                      <div className="section-body">
                        {(modalApp.experience && modalApp.experience.length) ? modalApp.experience.map((we,i) => (
                          <div key={i} className="exp-item">
                            <div className="exp-head"><div className="exp-role">{we.position}</div><div className="exp-company">{we.company}</div></div>
                            <div className="exp-duration">{we.duration}</div>
                            {we.description && <div className="exp-desc">{we.description}</div>}
                          </div>
                        )) : <div>—</div>}
                      </div>
                    </section>

                    {/* Certifications / Training section (flexible keys) */}
                    <section className="resume-section">
                      <h4 className="section-title">Certifications & Training</h4>
                      <div className="section-body">
                        {((modalApp.certifications && modalApp.certifications.length) || (modalApp.training && modalApp.training.length) || (modalApp.certificates && modalApp.certificates.length)) ? (
                          <div>
                            {(modalApp.certifications || modalApp.training || modalApp.certificates).map((c, idx) => {
                              // c might be string or object
                              const title = (typeof c === 'string') ? c : (c.name || c.title || c.course || c.certName);
                              const issuer = (typeof c === 'object' && (c.issuer || c.institution || c.provider)) ? ` — ${c.issuer || c.institution || c.provider}` : '';
                              const year = (typeof c === 'object' && (c.year || c.date)) ? ` (${c.year || (c.date && new Date(c.date).getFullYear())})` : '';
                              return <div key={idx} className="cert-item">{title}{issuer}{year}</div>;
                            })}
                          </div>
                        ) : <div>—</div>}
                      </div>
                    </section>

                    <section className="resume-section">
                      <h4 className="section-title">Education</h4>
                      <div className="section-body">
                        {(modalApp.education && modalApp.education.length) ? modalApp.education.map((ed,i) => (
                          <div key={i} className="edu-item">
                            <div className="edu-head"><div className="edu-school">{ed.school}</div><div className="edu-degree">{ed.degree}</div></div>
                            <div className="edu-duration">{ed.startYear || ''}{ed.endYear ? ` – ${ed.endYear}` : ''}</div>
                            {ed.description && <div className="edu-desc">{ed.description}</div>}
                          </div>
                        )) : <div>—</div>}
                      </div>
                    </section>

                    <section className="resume-section">
                      <h4 className="section-title">Skills</h4>
                      <div className="section-body">{Array.isArray(modalApp.skills) ? modalApp.skills.join(', ') : (modalApp.skills || '—')}</div>
                    </section>
                  </main>
                </div>
              )}
            </div>

            <div className="modal-actions">
              
            </div>
          </div>
        </div>
      )}
      {notesOpenFor && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target.classList && e.target.classList.contains('wc-modal-backdrop')) setNotesOpenFor(null); }}>
          <div className="wc-modal" role="document">
            <div className="modal-header">
              <h3>Notes / Feedback</h3>
              <button className="wc-modal-close" onClick={() => setNotesOpenFor(null)} aria-label="Close">×</button>
            </div>
            <div className="wc-modal-body">
              <textarea value={notesMap[notesOpenFor] || ''} onChange={(e) => setNotesMap(prev => ({ ...prev, [notesOpenFor]: e.target.value }))} style={{ width: '100%', minHeight: 160, padding: 12, borderRadius: 8, border: '1px solid #e6e6e9' }} />
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setNotesOpenFor(null)}>Cancel</button>
              <button className="wc-btn" onClick={() => { setNotesOpenFor(null); alert('Notes saved'); }}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- NEW HIRING CONFIRMATION MODAL --- */}
      {applicantToHire && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setApplicantToHire(null)}>
            <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Confirm Hiring</h3>
                    {/* <button className="wc-modal-close" onClick={() => setApplicantToHire(null)} aria-label="Close">×</button> */}
                </div>
                <p>
                    Confirm hiring 
                    <strong> {applicantToHire.fullName || 'this candidate'}</strong>
                    ? This action may be irreversible.
                </p>
                <div className="modal-actions">
                    <button type="button" className="wc-btn secondary" onClick={() => setApplicantToHire(null)}>Cancel</button>
                    <button type="button" className="wc-btn success" onClick={performHire} disabled={loadingAppId === applicantToHire._id}>
                      {loadingAppId === applicantToHire._id ? 'Saving...' : 'Confirm Hire'}
                    </button>
                </div>
            </div>
        </div>
      )}
      {/* --- END NEW MODAL --- */}

      <DocumentPreviewModal open={previewOpen} url={previewUrlState} title={previewTitle} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}