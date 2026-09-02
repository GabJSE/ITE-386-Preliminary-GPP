import React, { useState, useRef, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import './Jobs.css';
import { useJobs } from '../../contexts/JobsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { sendApplication, getApplicantApplications } from '../../api/applications';
import { getOwnProfile } from '../../api/profile';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';

// small local formatter for salary display
function formatSalary(job) {
  if (!job) return '';
  if (job.salary) return job.salary;
  const min = job.minSalary;
  const max = job.maxSalary;
  const curr = (job.currency || '').toUpperCase();

  // human-friendly suffix based on frequency
  const freqMap = {
    hourly: '/hr',
    monthly: '/mo',
    annual: '/yr',
    yearly: '/yr'
  };
  const freq = freqMap[(job.salaryFrequency || '').toLowerCase()] || '/yr';

  if (min == null && max == null) return '';

  // map common currency codes to symbols when available
  const symbolMap = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', INR: '₹', PHP: '₱' };
  const symbol = symbolMap[curr] || '';

  // format numbers with locale separators
  const fmt = (n) => (typeof n === 'number' ? new Intl.NumberFormat().format(n) : n);

  const prefix = symbol ? `${symbol} ` : (curr ? `${curr} ` : '');

  if (min != null && max != null) return `${prefix}${fmt(min)} - ${fmt(max)}${freq}`;
  if (min != null) return `${prefix}${fmt(min)}${freq}`;
  return `${prefix}${fmt(max)}${freq}`;
}

// Small helper component to render job descriptions with expand/collapse and optional sanitized HTML
function DescriptionBlock({ raw, htmlRaw, longLimit = 600 }) {
  const [showFull, setShowFull] = useState(false);
  const [renderHtml, setRenderHtml] = useState(false);

  const sanitizedHtml = (html) => {
    if (!html) return '';
    // Very small sanitizer: remove script tags and on* attributes
    // This is intentionally minimal — for production use a library like DOMPurify.
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '');
  };

  const content = raw || '';
  const isLong = content.length > longLimit;

  return (
    <div>
      {renderHtml && htmlRaw ? (
        <div style={{ color: '#444' }} dangerouslySetInnerHTML={{ __html: sanitizedHtml(htmlRaw) }} />
      ) : (
        <div style={{ color: '#444', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {isLong && !showFull ? `${content.slice(0, longLimit)}...` : content || 'No job description provided.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
        {isLong && (
          <button className="wc-btn wc-btn-outline" onClick={() => setShowFull(s => !s)}>{showFull ? 'Show less' : 'Show more'}</button>
        )}
        {htmlRaw && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={renderHtml} onChange={e => setRenderHtml(e.target.checked)} /> Render HTML
          </label>
        )}
      </div>
    </div>
  );
}

function Jobs() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrlState, setPreviewUrlState] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const { jobs, savedJobs, toggleSave } = useJobs();
  const [selected, setSelected] = useState(null);
  const [justSavedKey, setJustSavedKey] = useState(null);
  // normalize selected when jobs load/change (jobs may be fetched async)
  const location = useLocation();



  const handleDocumentView = (url, title = 'Document Preview') => {
    // Logic to ensure the URL is absolute for file APIs (similar to Profile.js usage)
    const getAbsoluteUrl = (u) => u && !u.startsWith('http') ? u : `/api/files/${u}`;
    setPreviewUrlState(getAbsoluteUrl(url));
    setPreviewTitle(title);
    setPreviewOpen(true);
  };
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;

    // If there's a jobId provided via URL query (or location.state), prefer that
    try {
      const params = new URLSearchParams(location.search);
      const jobIdFromQuery = params.get('jobId') || (location.state && location.state.jobId);
      if (jobIdFromQuery) {
        const found = jobs.find(j => String(j.id || j._id) === String(jobIdFromQuery));
        if (found) {
          setSelected(found);
          // If navigation requested opening apply dialog, honor it (but only if job not expired)
          try {
            if (location.state && location.state.openApply) {
              // small inline check for expiration
              const checkDeadline = found.deadline || found.applicationDeadline || found.expirationDate;
              const now = new Date();
              const isExpired = checkDeadline ? (new Date(checkDeadline) < now) : (String(found.status || '').toLowerCase() === 'closed');
              if (isExpired) {
                toast.error('Application Deadline Passed — this job is no longer accepting applications.');
              } else setShowApply(true);
            }
          } catch (e) {
            // ignore
          }
          return;
        }
      }
    } catch (e) {
      // ignore URL parsing errors and fall back to default selection
    }

    // if no selected job, pick first
    if (!selected) {
      setSelected(jobs[0]);
      return;
    }

    // if current selected is no longer present, reset to first
    const selId = selected.id || selected._id;
    const found = jobs.find(j => (j.id || j._id) === selId);
    if (!found) setSelected(jobs[0]);
  }, [jobs, selected, location.search, location.state]);
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [remoteOption, setRemoteOption] = useState(null); // 'Remote' | 'On-site' | 'Hybrid'
  const [datePosted, setDatePosted] = useState(null); // '24h' | '7d' | '30d'
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const filtersRef = useRef(null);
  const saveBtnRef = useRef(null);
  const { profile, userId, token, setProfile } = useAuth();
  const [showRecommended, setShowRecommended] = useState(false);
  const ALL_JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const toast = useToast();
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(false);


  const scoreJobFit = (job, profile) => {
    if (!profile || !job) return 0;
    let score = 0;

    // Use profile fields based on the provided schema
    const prefType = profile.desiredJobType ? String(profile.desiredJobType).toLowerCase() : null;
    const prefCategories = Array.isArray(profile.preferredJobCategories)
        ? profile.preferredJobCategories.map(c => String(c).toLowerCase())
        : [];
    const prefLoc = profile.preferredLocation ? String(profile.preferredLocation).toLowerCase() : null;
    const prefExp = profile.careerLevelTarget ? String(profile.careerLevelTarget).toLowerCase() : null;
    const profSkills = Array.isArray(profile.skills) ? profile.skills.map(s => String(s).toLowerCase()) : [];

    // 1. Job Category Match (Highest weight: 5)
    const jobCat = job.category || '';
    if (jobCat && prefCategories.length > 0) {
      if (prefCategories.some(pref => jobCat.toLowerCase().includes(pref))) {
        score += 5;
      }
    }

    // 2. Location Match (Weight: 4)
    const jobLocString = ((job.location || job.city || job.country) || '').toLowerCase();
    if (prefLoc && jobLocString.includes(prefLoc)) {
      score += 4;
    }

    // 3. Job Type Match (Weight: 3) - Uses desiredJobType
    if (prefType && job.type && job.type.toLowerCase() === prefType) {
      score += 3;
    }

    // 4. Career Level/Experience Match (Weight: 2)
    if (prefExp && job.experienceLevel && job.experienceLevel.toLowerCase() === prefExp) {
      score += 2;
    }

    // 5. Skill Overlap (Weight: 1 per skill, max 3)
    if (Array.isArray(job.skills) && profSkills.length > 0) {
      const jobSkillsLower = job.skills.map(s => String(s).toLowerCase());
      const matches = jobSkillsLower.filter(s => profSkills.includes(s));
      score += Math.min(matches.length, 3);
    }

    return score;
};



  // derive a sensible full name from various profile shapes
  const getFullName = (p) => {
    if (!p) return '';
    if (p.fullName) return p.fullName;
    if (p.name) return p.name;
    // common variations
    const first = p.firstName || p.firstname || p.givenName || p.given_name;
    const last = p.lastName || p.lastname || p.familyName || p.family_name;
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return '';
  };

  // apply modal state
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [availability, setAvailability] = useState('Full-time');
  const [submitting, setSubmitting] = useState(false);
  // controlled fields for apply modal so user can edit
  const [applyFullName, setApplyFullName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyContact, setApplyContact] = useState('');
  const [applyResumeUrl, setApplyResumeUrl] = useState('');
  const [applyCvFile, setApplyCvFile] = useState(null);
  // optimistic map to track jobs the user has just applied to client-side
  const [appliedMap, setAppliedMap] = useState({});

  // seed modal fields from profile when available
  useEffect(() => {
    if (!profile) return;
    if (profile.expectedSalary) setExpectedSalary(profile.expectedSalary);
    // profile may have preferred availability or workArrangement
    if (profile.desiredJobType) setAvailability(profile.desiredJobType);
    else if (profile.workArrangement && (profile.workArrangement === 'Remote' || profile.workArrangement === 'Full-time' || profile.workArrangement === 'Part-time')) setAvailability(profile.workArrangement);
  }, [profile]);

  // prefill apply modal controlled inputs when modal opens or profile changes
  // Fetch the authoritative profile from the server when possible so we surface
  // any persisted resumeUrl or updated contact details that may not be in auth context.
  useEffect(() => {
    if (!showApply) return;
    let cancelled = false;
    async function loadProfile() {
      try {
        // prefer server fetch using token/userId/email for most accurate record
        const p = await getOwnProfile(token, userId, profile?.email);
        if (cancelled) return;
        const src = p || profile || {};
        setApplyFullName(getFullName(src));
        setApplyEmail(src?.email || '');
        setApplyContact(src?.phone || src?.contactNumber || '');
        const resumeUrl = src?.resumeUrl || (src.resume && src.resume.url) || src?.resume?.url || '';
        setApplyResumeUrl(resumeUrl);
        setApplyCvFile(null);
        // update auth context if we fetched a more complete profile
        if (p && typeof setProfile === 'function') setProfile(p);
      } catch (e) {
        // fallback to whatever we have in auth context
        const src = profile || {};
        setApplyFullName(getFullName(src));
        setApplyEmail(src?.email || '');
        setApplyContact(src?.phone || src?.contactNumber || '');
        const resumeUrl = src?.resumeUrl || (src.resume && src.resume.url) || src?.resume?.url || '';
        setApplyResumeUrl(resumeUrl);
        setApplyCvFile(null);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [showApply, profile, token, userId, setProfile]);

  // helper to determine if a job is expired/closed
  function isJobExpired(job) {
    if (!job) return false;
    if (job.status && String(job.status).toLowerCase() === 'closed') return true;
    const now = new Date();
    const candidate = job.deadline || job.applicationDeadline || job.expirationDate || job.expireAt || null;
    if (!candidate) return false;
    try {
      const d = new Date(candidate);
      if (isNaN(d.getTime())) return false;
      return d < now;
    } catch (e) {
      return false;
    }
  }

  // helper to determine if the current user has applied to a job (considers many common field names
  // and the optimistic appliedMap state)
  const hasUserApplied = (job) => {
    if (!job) return false;
    try {
      const jobKey = (job && (job.id || job._id)) || '';
      const status = job && (job.applicationStatus || job.application_status || job.status || '');
      // check common boolean/string flags
      if (job.applied || job.userApplied || job.appliedByCurrentUser || job.hasApplied || job.has_applied) return true;
      if (job.hasAppliedByCurrentUser || job.has_applied_by_current_user) return true;
      if (typeof status === 'string' && status.toLowerCase() === 'applied') return true;

      // optimistic map
      if (jobKey && appliedMap && appliedMap[jobKey]) return true;

      // check common application-list shapes where job contains application objects
      const apps = job.applications || job.applicants || job.applicationsList || job.applications_list || job.applications_by || null;
      if (Array.isArray(apps) && apps.length > 0 && (userId || (profile && (profile._id || profile.id || profile.userId || profile.email)))) {
        const uid = userId || (profile && (profile._id || profile.id || profile.userId));
        const email = profile && profile.email;
        for (const a of apps) {
          if (!a) continue;
          // various possible shapes: applicantId, userId, ownerId, email
          if (uid && (String(a.applicantId || a.userId || a.user || a.ownerId || a.applicant || a._id) === String(uid))) return true;
          if (email && (String(a.email || a.applicantEmail || a.applicant_email || a.ownerEmail) === String(email))) return true;
          // application object might directly include jobId and applicantId
          if (uid && a.applicant && String(a.applicant) === String(uid)) return true;
        }
      }

      return false;
    } catch (e) {
      return Boolean(job && job.applied);
    }
  };

  useEffect(() => {
    function onDoc(e) {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setOpenDropdown(null);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // when a job is selected, ask the server whether the current user already has an application
  useEffect(() => {
    let mounted = true;
    async function checkApplied() {
      if (!selected) return;
      const uid = userId || (profile && (profile._id || profile.id || profile.userId));
      if (!uid) return; // no logged in user
    try {
      const res = await getApplicantApplications(uid);
      // server may return an object { applications: [...] } or an array directly
      const apps = Array.isArray(res) ? res : (res && res.applications) || [];
      const jobId = selected.id || selected._id || selected.jobId || '';
      const found = Array.isArray(apps) && apps.find(a => String(a.jobId || a.job || a.jobId) === String(jobId));
        if (found) {
          const key = jobId;
          if (mounted) {
            // mark optimistic map and selected.applied so UI updates immediately
            if (key) setAppliedMap(prev => ({ ...prev, [key]: true }));
            try { setSelected(s => s ? { ...s, applied: true } : s); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        // ignore network errors - fallback to local heuristics
      }
    }
    checkApplied();
    return () => { mounted = false; };
  }, [selected, userId, profile]);

  // keep focus on the save button when a job is just-saved or when the saved state changes
  useEffect(() => {
    try {
      const key = selected && (selected.id || selected._id);
      if (!key) return;
      // if we just saved this job (justSavedKey) or the savedJobs list includes it, focus the button
      if (justSavedKey === key || (Array.isArray(savedJobs) && savedJobs.includes(key))) {
        saveBtnRef.current && saveBtnRef.current.focus();
      }
    } catch (e) {
      // ignore focus errors
    }
  }, [justSavedKey, savedJobs, selected]);

  // apply text search first
  let filtered = jobs.filter(j => (j.title + ' ' + j.company + ' ' + j.location).toLowerCase().includes(query.toLowerCase()));

  // apply selected filters (support multiple active filters, AND logic)
  const active = selectedFilter ? (Array.isArray(selectedFilter) ? selectedFilter : [selectedFilter]) : [];
  if (active.length > 0) {
    filtered = filtered.filter(job => {
      return active.every(f => {
        switch (f) {
          case 'Not Applied': {
            // consider multiple indicators that a user has applied:
            // - job.applied (boolean)
            // - optimistic appliedMap set when user submits an application
            // - other common backend shapes: userApplied, appliedByCurrentUser, hasApplied, has_applied
            // - application status field like applicationStatus === 'applied'
            try {
              const jobKey = (job && (job.id || job._id)) || '';
              const status = job && (job.applicationStatus || job.application_status || job.status || '');
              const appliedFlag = Boolean(
                job && (
                  job.applied ||
                  job.userApplied ||
                  job.appliedByCurrentUser ||
                  job.hasApplied ||
                  job.has_applied ||
                  job.hasAppliedByCurrentUser ||
                  job.has_applied_by_current_user ||
                  (typeof status === 'string' && status.toLowerCase() === 'applied')
                ) ||
                (jobKey && appliedMap && appliedMap[jobKey])
              );
              return !appliedFlag;
            } catch (e) {
              return !Boolean(job && job.applied);
            }
          }
          default: return true;
        }
      });
    });
  }

  // Job Type dropdown filter
  if (selectedJobTypes.length > 0) {
    filtered = filtered.filter(job => selectedJobTypes.includes(job.type));
  }

  // Remote option filter
  if (remoteOption) {
    if (remoteOption === 'Remote') filtered = filtered.filter(j => j.isRemote);
    else if (remoteOption === 'On-site') filtered = filtered.filter(j => !j.isRemote && !j.isHybrid);
    else if (remoteOption === 'Hybrid') filtered = filtered.filter(j => j.isHybrid);
  }

  // Date posted filter
  if (datePosted) {
    const now = new Date();
    filtered = filtered.filter(job => {
      const posted = new Date(job.postedAt);
      const diffDays = (now - posted) / (1000 * 60 * 60 * 24);
      if (datePosted === '24h') return diffDays <= 1;
      if (datePosted === '7d') return diffDays <= 7;
      if (datePosted === '30d') return diffDays <= 30;
      return true;
    });
  }

  // Recommended-only filter: score jobs against profile preferences and keep positive matches
  if (recommendedOnly && profile) {
    try {
      // 💡 MODIFICATION:
      // Replaced the old inline scoreJob function with the `scoreJobFit`
      // function (defined at the top of this file) to match the
      // recommendation logic from JobhunterDashboard.js.
      
      const scored = filtered.map(j => ({ j, score: scoreJobFit(j, profile) }));
      
      // Filter for jobs with a score greater than 0
      const positive = scored.filter(x => x.score > 0).map(x => x.j);

      // Set the filtered list to only the positive matches.
      // If 'positive' is empty, 'filtered' will become empty,
      // which is correct for an active filter.
      filtered = positive;
      
    } catch (e) {
      // fallback: leave filtered as-is
      console.warn('Error applying recommended filter:', e);
    }
  }

  return (
    <div className="jobs-root page-content jobs-page">
    {/* normalize selected id for comparisons */}
    {null}
  <div className="jobs-inner">
        {/* search */}
        <div className="jobs-search">
          <input className="wc-search jobs-search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search jobs, company or location" />
          {/* <button className="wc-btn wc-btn-outline">Search</button> */}
        </div>

  {/* filters */}
  <div className="jobs-filters" ref={filtersRef}>
    <div className="filters-row">
      <div className="filters-left">
              {/* Recommended filter (based on profile prefs) */}
              <div className={`jobs-filter-wrap ${recommendedOnly ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${recommendedOnly ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setRecommendedOnly(r => !r); }}>
                  <span>Recommended</span>
                </button>
              </div>
              {/* Job Type dropdown */}
              <div className={`jobs-filter-wrap ${selectedJobTypes.length ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${selectedJobTypes.length ? 'active' : ''} ${openDropdown === 'jobType' ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'jobType' ? null : 'jobType'); }}>
                  <span>Job Type</span>
                  <svg className="jobs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {openDropdown === 'jobType' && (
                  <div className="jobs-dropdown-menu">
                    {/* MODIFIED: Use a combined list to ensure Contract and Internship are always available */}
                    {Array.from(new Set([
                      ...ALL_JOB_TYPES, // 💡 Use the new static list
                      ...(jobs || []).map(j => j && j.type).filter(Boolean) // Include any custom types from jobs data
                    ])).map(type => (
                      <label key={type} className="jobs-dropdown-item">
                        <input
                          type="checkbox"
                          checked={selectedJobTypes.includes(type)}
                          onChange={() => {
                            setSelectedJobTypes(prev => {
                              const copy = Array.isArray(prev) ? prev.slice() : [];
                              const idx = copy.indexOf(type);
                              if (idx === -1) return [...copy, type];
                              copy.splice(idx, 1);
                              return copy;
                            });
                          }}
                        /> {type}
                      </label>
                    ))}
                    {(!jobs || (Array.isArray(jobs) && jobs.length === 0)) && <div className="jobs-dropdown-item">No types available</div>}
                  </div>
                )}
              </div>

              {/* Remote dropdown */}
              <div className={`jobs-filter-wrap ${remoteOption ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${remoteOption ? 'active' : ''} ${openDropdown === 'remote' ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'remote' ? null : 'remote'); }}>
                  <span>Remote</span>
                  <svg className="jobs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {openDropdown === 'remote' && (
                  <div className="jobs-dropdown-menu">
                    {['Remote', 'On-site', 'Hybrid'].map(opt => (
                      <label key={opt} className="jobs-dropdown-item"><input type="radio" name="remote" checked={remoteOption === opt} onChange={() => setRemoteOption(opt)} /> {opt}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Posted dropdown */}
              <div className={`jobs-filter-wrap ${datePosted ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${datePosted ? 'active' : ''} ${openDropdown === 'date' ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'date' ? null : 'date'); }}>
                  <span>Date Posted</span>
                  <svg className="jobs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {openDropdown === 'date' && (
                  <div className="jobs-dropdown-menu">
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === '24h'} onChange={() => setDatePosted('24h')} /> Last 24 hours</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === '7d'} onChange={() => setDatePosted('7d')} /> Last 7 days</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === '30d'} onChange={() => setDatePosted('30d')} /> Last 30 days</label>
                  </div>
                )}
              </div>

              {/* Not Applied toggle */}
              <button
                className={`jobs-filter-pill ${(Array.isArray(selectedFilter) ? selectedFilter.includes('Not Applied') : selectedFilter === 'Not Applied') ? 'active' : ''}`}
                onClick={() => setSelectedFilter(prev => {
                  // normalize to array before toggling
                  const arr = Array.isArray(prev) ? prev.slice() : (prev ? [prev] : []);
                  const idx = arr.indexOf('Not Applied');
                  if (idx !== -1) {
                    arr.splice(idx, 1);
                    return arr;
                  }
                  return [...arr, 'Not Applied'];
                })}
                aria-pressed={(Array.isArray(selectedFilter) ? selectedFilter.includes('Not Applied') : selectedFilter === 'Not Applied')}
              >Not Applied</button>

              {/* Exclusive Offers toggle */}
              {/* <button className={`jobs-filter-pill ${selectedFilter.includes('Exclusive Offers') ? 'active' : ''}`} onClick={() => setSelectedFilter(prev => prev.includes('Exclusive Offers') ? prev.filter(x => x !== 'Exclusive Offers') : [...prev, 'Exclusive Offers'])} aria-pressed={selectedFilter.includes('Exclusive Offers')}>Exclusive Offers</button> */}
            </div>
            <div className="filters-right">
              <button className="jobs-clear" onClick={() => { setSelectedFilter([]); setSelectedJobTypes([]); setRemoteOption(null); setDatePosted(null); }}>Clear filters</button>
            </div>
          </div>
        </div>

        <div className="jobs-columns">
          {/* left list */}
          <div className="jobs-left">
            <div className="jobs-left-list">
              {filtered.length === 0 ? (
                <div className="no-jobs">No jobs match your filters.</div>
              ) : (
                filtered.map(job => (
                  <div key={job.id || job._id} onClick={() => setSelected(job)} className={`jobs-list-item ${(selected && (selected.id || selected._id)) === (job.id || job._id) ? 'active' : ''}`}>
                    <div className="jobs-list-top">
                      <div className="jobs-list-title">{job.title}</div>
                      <div className="job-type-pill">{job.type}</div>
                    </div>
                    <div className="job-company">{job.company} · {job.location}</div>
                    <div className="job-summary">{job.summary}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* right detail */}
          <div className="jobs-right">
            {selected ? (
              <>
                <div className="job-detail-top">
                  <div className="job-detail-left">
                    <div className="job-logo">
                      {selected.logoUrl ? (
                        <img src={selected.logoUrl} alt={selected.company} className="job-logo-img" />
                      ) : (
                        <div className="job-logo-fallback">{selected.logoName ? selected.logoName.split('.')[0] : selected.company ? selected.company.split(' ')[0] : 'Logo'}</div>
                      )}
                    </div>
                      <div className="job-main-meta">
                      <div className="job-title">{selected.title}</div>
                      <div
                        className="job-submeta"
                        style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                        role="button"
                        tabIndex={0}
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Try to fetch the employer profile using the job's employer id (createdBy etc.)
                          const employerId = selected.createdBy || selected.created_by || selected.employerId || selected.companyId || selected.postedBy || null;
                          setCompanyProfile(null);
                          setShowCompanyModal(true);
                          if (!employerId) {
                            // no employer id: show minimal info from the job object
                            setCompanyProfile({
                              companyName: selected.company || '',
                              companyDescription: selected.companyAbout || selected.companyDescription || '',
                              companyWebsite: selected.companyWebsite || selected.website || null,
                              logoUrl: selected.logoUrl || selected.logo || null,
                              location: selected.location || null,
                            });
                            return;
                          }
                          try {
                            setLoadingCompany(true);
                            const token = null; // don't pass auth token when fetching other profiles (backend will use query param)
                            const prof = await getOwnProfile(token, employerId, null);
                            setCompanyProfile(prof || { companyName: selected.company || '' });
                          } catch (err) {
                            console.warn('Could not fetch company profile', err);
                            setCompanyProfile({ companyName: selected.company || '', companyDescription: selected.companyAbout || '' });
                          } finally {
                            setLoadingCompany(false);
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }}
                        title="View company profile"
                      >
                        {selected.company} · {selected.location}
                      </div>
                      {selected.companyAbout && <div className="job-company-about">{selected.companyAbout}</div>}
                      <div className="job-tags">
                        {selected.type && <div className="job-tag">{selected.type}</div>}
                        {selected.isRemote && <div className="job-tag job-remote">Remote</div>}
                        {selected.isHybrid && <div className="job-tag job-hybrid">Hybrid</div>}
                        {selected.exclusive && <div className="job-tag job-exclusive">Exclusive</div>}
                        {selected.postedAt && <div className="job-posted">• Posted {new Date(selected.postedAt).toLocaleDateString()}</div>}
                        {formatSalary(selected) && <div className="job-salary-inline">{formatSalary(selected)}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="job-detail-right">
                    <div className="job-actions">
                      {(() => {
                        const expired = isJobExpired(selected);
                        const jobKey = (selected && (selected.id || selected._id)) || '';
                        const alreadyApplied = hasUserApplied(selected);
                        return (
                          <button
                            className="wc-btn wc-btn-primary"
                            onClick={() => {
                              if (expired) return toast.error('Application Deadline Passed — this job is no longer accepting applications.');
                              if (alreadyApplied) return toast.info('You have already applied to this job.');
                              setShowApply(true);
                            }}
                            disabled={expired || alreadyApplied}
                            title={alreadyApplied ? 'You have already applied to this job' : (expired ? 'Application deadline passed' : 'Apply')}
                          >
                            {expired ? 'Application Deadline Passed' : (alreadyApplied ? 'Applied' : 'Apply')}
                          </button>
                        );
                      })()}
                      <button
                        ref={saveBtnRef}
                        className={`wc-btn wc-btn-outline jobs-save-btn ${savedJobs.includes(selected?.id || selected?._id) ? 'saved' : ''} ${justSavedKey === (selected?.id || selected?._id) ? 'just-saved' : ''}`}
                        title={savedJobs.includes(selected?.id || selected?._id) ? 'Saved' : 'Save job'}
                        onClick={() => {
                          const key = selected && (selected.id || selected._id) ? (selected.id || selected._id) : '';
                          try { toggleSave(selected); } catch (e) { toggleSave(selected); }
                          // keep focus on the button for accessibility
                          try { saveBtnRef.current && saveBtnRef.current.focus(); } catch (e) { /* ignore */ }
                          if (key) {
                            setJustSavedKey(key);
                            window.setTimeout(() => { setJustSavedKey(k => (k === key ? null : k)); }, 1500);
                          }
                        }}
                        aria-pressed={savedJobs.includes(selected?.id || selected?._id)}
                      >
                        {/* bookmark icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M6 2h12v18l-6-3-6 3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={savedJobs.includes(selected?.id || selected?._id) ? 'currentColor' : 'none'} />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="jobs-right-scroll">
                  <hr className="job-divider" />
                  <h4>Job Description</h4>
                  {/* Expand/collapse and optional sanitized HTML rendering */}
                  {(() => {
                    const raw = selected.description || selected.content || selected.longDescription || '';
                    const htmlRaw = selected.descriptionHtml || selected.html || '';
                    const LONG_LIMIT = 600;
                    return (
                      <DescriptionBlock
                        raw={raw}
                        htmlRaw={htmlRaw}
                        longLimit={LONG_LIMIT}
                      />
                    );
                  })()}

                  {/* Employer-provided structured fields */}
                  {selected.responsibilities && selected.responsibilities.length > 0 && (
                    <>
                      <h4 className="section-heading">Responsibilities</h4>
                      <ul>
                        {selected.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </>
                  )}

                  {selected.requirements && selected.requirements.length > 0 && (
                    <>
                      <h4 className="section-heading">Requirements</h4>
                      <ul>
                        {selected.requirements.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </>
                  )}

                  {selected.qualifications && selected.qualifications.length > 0 && (
                    <>
                      <h4 className="section-heading">Qualifications</h4>
                      <ul>
                        {selected.qualifications.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </>
                  )}

                  {selected.benefits && selected.benefits.length > 0 && (
                    <>
                      <h4 className="section-heading">Benefits</h4>
                      <ul>
                        {selected.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </>
                  )}

                  {selected.skills && selected.skills.length > 0 && (
                    <>
                      <h4 className="section-heading">Skills</h4>
                      <div className="skills-list">
                        {selected.skills.map((s, i) => <div key={i} className="skill-chip">{s}</div>)}
                      </div>
                    </>
                  )}

                  {/* How to apply / contact */}
                  {(selected.applyUrl || selected.applyEmail || selected.howToApply) && (
                    <>
                      <h4 className="section-heading">How to apply</h4>
                      <div className="how-to-apply">
                        {selected.howToApply || (selected.applyEmail ? <a href={`mailto:${selected.applyEmail}`}>{selected.applyEmail}</a> : null) || (selected.applyUrl ? <a href={selected.applyUrl} target="_blank" rel="noreferrer">Apply on company site</a> : null)}
                      </div>
                    </>
                  )}

                  {/* (duplicate sections removed) */}
                </div>
              </>
            ) : (
              <div className="no-selection">Select a job to view details</div>
            )}
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {showApply && selected && (
        <div className="wc-modal-backdrop">
          <div className="wc-modal">
            <div className="modal-header">
              <h3>Apply for: {selected.title}</h3>
            </div>

            {/* modal-body: scrollable content area for the form */}
            <div className="modal-body">
              <form className="grid-form" onSubmit={e => e.preventDefault()}>
                <div className="form-section">
                  <label htmlFor="applyFullName">Full name</label>
                  <input id="applyFullName" className="wc-input" value={applyFullName} onChange={e => setApplyFullName(e.target.value)} placeholder="Your full name" />
                </div>

                <div className="form-section">
                  <label htmlFor="applyEmail">Email address</label>
                  <input id="applyEmail" className="wc-input" value={applyEmail} onChange={e => setApplyEmail(e.target.value)} placeholder="you@example.com" />
                </div>

                <div className="form-section">
                  <label htmlFor="applyContact">Contact number</label>
                  <input id="applyContact" className="wc-input" value={applyContact} onChange={e => setApplyContact(e.target.value)} placeholder="+1 234 567 890" />
                </div>

                <div className="full-row form-section">
                  <label htmlFor="resumeUrl">Resume / CV (link)</label>
                  <input id="resumeUrl" className="wc-input" value={applyResumeUrl} onChange={e => setApplyResumeUrl(e.target.value)} placeholder="https://example.com/your-resume.pdf" />
                  <div className="upload-help" style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--wc-muted)' }}>Or upload CV (optional)</label>
                    <input id="applyCvFile" className="wc-input" type="file" accept=".pdf,.doc,.docx" onChange={e => setApplyCvFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                  </div>
                  {applyResumeUrl ? (
                    <div className="resume-note" style={{ marginTop: 8 }}>
                        Existing resume:
                        {applyResumeUrl ? ( // Add a check to only show the link if a URL exists
                            <a 
                                href="#" // Use '#' or remove href entirely
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent default link navigation
                                    handleDocumentView(applyResumeUrl, 'Existing Resume');
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                View
                            </a>
                        ) : (
                            // Optional: show a placeholder if no resume is linked
                            <span style={{ color: 'var(--wc-muted)' }}>None linked</span>
                        )}
                    </div>
                  ) : null}
                </div>

                {/* <div className="full-row form-section">
                  <label htmlFor="coverLetter">Cover letter / short message</label>
                  <textarea id="coverLetter" className="wc-input" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Briefly introduce yourself and why you're a fit" />
                </div> */}

    
              </form>
            </div>

            <div className="modal-actions">
              <button className="wc-btn wc-btn-outline" onClick={() => setShowApply(false)}>Cancel</button>
                  <button className="wc-btn wc-btn-primary" disabled={submitting} onClick={async () => {
                    if (!profile) return toast.error('You must be logged in to apply');
                    // double-check applied status before submitting
                    if (hasUserApplied(selected)) return toast.info('You have already applied to this job.');
                    const jobKey = selected && (selected.id || selected._id) ? (selected.id || selected._id) : '';
                    // prevent duplicate submission if we have an optimistic flag set
                    if (jobKey && appliedMap[jobKey]) return toast.info('Application already in progress or submitted.');
                    setSubmitting(true);
                    // set optimistic flag immediately to prevent races / double clicks
                    if (jobKey) setAppliedMap(prev => ({ ...prev, [jobKey]: true }));
                    try {
                  // gather values from controlled inputs
                  const fullName = applyFullName || getFullName(profile) || '';
                  const email = applyEmail || profile.email || '';
                  const contactNumber = applyContact || profile.phone || '';

                  // resume: prefer uploaded file, then resumeUrl state, then profile.resumeUrl
                  let resumeUrl = applyResumeUrl || profile.resumeUrl || '';
                  if (applyCvFile) {
                    try {
                      const fd = new FormData();
                      fd.append('file', applyCvFile);
                      const up = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
                      if (up.ok) {
                        const j = await up.json();
                        resumeUrl = j.url || resumeUrl;
                      } else {
                        console.warn('Resume upload failed', await up.text());
                      }
                    } catch (e) {
                      console.warn('Resume upload error', e);
                    }
                  }

                  const payload = {
                    // applicantId: prefer top-level userId from auth context, fall back to profile ids
                    applicantId: userId || profile.userId || profile._id || profile.id || '',
                    // employerId is stored on job as `createdBy` on the backend; fall back to other common fields
                    employerId: selected.createdBy || selected.created_by || selected.employerId || selected.companyId || selected.postedBy || '',
                    jobId: (selected.id || selected._id || '') ,
                    jobTitle: selected.title,
                    fullName,
                    email,
                    contactNumber,
                    location: profile.city || profile.location || '',
                    profilePictureUrl: profile.avatar || profile.picture || '',
                    resumeUrl,
                    education: {
                      highestAttainment: (document.getElementById('eduAttainment') || {}).value || ''
                    },
                    workExperience: [{
                      jobTitle: (document.getElementById('weTitle') || {}).value || '',
                      company: (document.getElementById('weCompany') || {}).value || '',
                      startDate: (document.getElementById('weDates') || {}).value || '',
                      endDate: '',
                      responsibilities: (document.getElementById('weResponsibilities') || {}).value || ''
                    }],
                    skills: ((document.getElementById('skills') || {}).value || '').split(',').map(s => s.trim()).filter(Boolean),
                    coverLetter,
                    expectedSalary,
                    availability,
                    applicationDate: new Date().toISOString()
                  };

                  // If employerId is missing, try to resolve it by fetching the canonical job from the backend
                  if (!payload.employerId && payload.jobId) {
                    try {
                      const base = process.env.REACT_APP_API_BASE || '';
                      const jobsRes = await fetch(`${base}/api/jobs`);
                      if (jobsRes.ok) {
                        const jobsData = await jobsRes.json();
                        const found = (Array.isArray(jobsData) ? jobsData : (jobsData.jobs || [])).find(j => String(j._id || j.id) === String(payload.jobId));
                        if (found) {
                          payload.employerId = found.createdBy || found.created_by || payload.employerId || '';
                        }
                      }
                    } catch (e) {
                      // ignore backend lookup errors — we'll handle missing employer below
                    }
                  }

                  // validate required fields before sending to avoid 400 from server
                  if (!payload.applicantId || !payload.employerId || !payload.jobId) {
                    const missing = [];
                    if (!payload.applicantId) missing.push('applicantId');
                    if (!payload.employerId) missing.push('employerId');
                    if (!payload.jobId) missing.push('jobId');
                    // give a clearer error when employerId is missing
                    if (missing.length === 1 && missing[0] === 'employerId') {
                      throw new Error('This job does not have an associated employer on the server — cannot submit application.');
                    }
                    throw new Error('Missing required fields: ' + missing.join(', '));
                  }

                  await sendApplication(payload);
                  // optimistic UI update: ensure selected job marked applied
                  try {
                    if (jobKey) setSelected(s => s ? { ...s, applied: true } : s);
                  } catch (e) { /* ignore */ }
                  toast.success('Application submitted');
                  setShowApply(false);
                } catch (err) {
                  console.error(err);
                  // Try to show a helpful server error message when available
                  const msg = err && err.message ? err.message : String(err);
                  // server may return JSON text like { error: '...' } so attempt to parse
                  let friendly = msg;
                  try {
                    const j = JSON.parse(msg);
                    if (j && j.error) friendly = j.error;
                  } catch (e) {
                    // ignore parse errors
                  }
                  // revert optimistic applied flag on failure
                  if (jobKey) setAppliedMap(prev => { const cp = { ...prev }; delete cp[jobKey]; return cp; });
                  toast.error('Failed to submit application: ' + friendly);
                } finally { setSubmitting(false); }
              }}>Submit application</button>
            </div>
          </div>
        </div>
      )}

      {/* Company modal (reuses standard wc-modal structure used elsewhere) */}
      {showCompanyModal && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target.classList && e.target.classList.contains('wc-modal-backdrop')) setShowCompanyModal(false); }}>
  <div className="wc-modal company-modal" role="document">
            <div className="modal-header">
              <h3>{companyProfile ? (companyProfile.companyName || companyProfile.company || selected.company) : 'Company'}</h3>
              {/* <button className="wc-modal-close" onClick={() => setShowCompanyModal(false)} aria-label="Close">×</button> */}
            </div>
            <div className="wc-modal-body company-modal-body">
              {loadingCompany && !companyProfile ? (
                <div className="company-loading">Loading company profile…</div>
              ) : (
                <div className="company-modal-grid">
                  <div className="company-branding">
                    <div className="company-logo-wrap">
                      { (companyProfile && (companyProfile.companyLogo || companyProfile.logoUrl || companyProfile.logo)) ? (
                        <img className="company-logo" src={companyProfile.companyLogo || companyProfile.logoUrl || companyProfile.logo} alt="logo" />
                      ) : (
                        <div className="company-initials">{(companyProfile && (companyProfile.companyName || companyProfile.company) ? (companyProfile.companyName || companyProfile.company).split(' ').map(s=>s[0]).slice(0,2).join('') : (selected.company || 'C')).toUpperCase()}</div>
                      ) }
                    </div>

                    <div className="company-title-wrap">
                      <div className="company-title">{companyProfile ? (companyProfile.companyName || companyProfile.company) : selected.company}</div>
                      {companyProfile && companyProfile.tagline ? <div className="company-tagline">{companyProfile.tagline}</div> : null}
                    </div>
                    {/* mission moved to company-more section (below Founding story) to avoid duplication */}

                    <div className="company-quick-facts">
                      <div className="quick-facts-title">Quick facts</div>
                      <div className="quick-facts-list">
                        <div className="fact">{companyProfile && companyProfile.industry ? companyProfile.industry : 'Industry: —'}</div>
                        <div className="fact">{companyProfile && companyProfile.companySize ? `Size: ${companyProfile.companySize}` : 'Size: —'}</div>
                        <div className="fact">{companyProfile && companyProfile.companyWebsite ? (<a className="company-link" href={companyProfile.companyWebsite} target="_blank" rel="noreferrer">Website</a>) : (selected.companyWebsite ? (<a className="company-link" href={selected.companyWebsite} target="_blank" rel="noreferrer">Website</a>) : 'Website: —')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="company-details">
                    <section className="company-overview">
                      <div className="section-title">Company Overview</div>
                      <div className="section-body">{(companyProfile && (companyProfile.companyDescription || companyProfile.companyAbout || companyProfile.mission || companyProfile.summary)) || selected.companyAbout || '—'}</div>
                    </section>

                    <section className="company-contact">
                      <div className="section-title">Location & Contact</div>
                      <div className="section-body">
                        <div className="contact-line">{companyProfile && (companyProfile.companyStreetAddress || companyProfile.companyCity || companyProfile.companyRegion || companyProfile.companyPostalCode || companyProfile.companyCountry)
                          ? [companyProfile.companyStreetAddress, companyProfile.companyCity, companyProfile.companyRegion, companyProfile.companyPostalCode, companyProfile.companyCountry].filter(Boolean).join(', ')
                          : (companyProfile && companyProfile.location) || selected.location || '—'
                        }</div>
                        <div className="contact-line">Email: {companyProfile && (companyProfile.ownerEmail || companyProfile.email) ? (<a className="company-link" href={`mailto:${companyProfile.ownerEmail || companyProfile.email}`}>{companyProfile.ownerEmail || companyProfile.email}</a>) : '—'}</div>
                        <div className="contact-line">Phone: {companyProfile && (companyProfile.ownerPhone || companyProfile.phone) ? (companyProfile.ownerPhone || companyProfile.phone) : '—'}</div>
                        {companyProfile && companyProfile.ownerName ? <div className="contact-line">Contact person: {companyProfile.ownerName}{companyProfile.ownerPosition ? ` — ${companyProfile.ownerPosition}` : ''}</div> : null}
                      </div>
                    </section>

                    <section className="company-links">
                      <div className="section-title">Social & External Links</div>
                      <div className="section-body links-list">
                        {companyProfile && companyProfile.linkedin ? <a className="company-cta" href={companyProfile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> : null}
                        {companyProfile && companyProfile.facebook ? <a className="company-cta" href={companyProfile.facebook} target="_blank" rel="noreferrer">Facebook</a> : null}
                        {companyProfile && companyProfile.twitter ? <a className="company-cta" href={companyProfile.twitter} target="_blank" rel="noreferrer">Twitter</a> : null}
                        {companyProfile && companyProfile.instagram ? <a className="company-cta" href={companyProfile.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}
                        {companyProfile && companyProfile.blog ? <a className="company-cta" href={companyProfile.blog} target="_blank" rel="noreferrer">Blog</a> : null}
                        {companyProfile && companyProfile.careersPage ? <a className="company-cta" href={companyProfile.careersPage} target="_blank" rel="noreferrer">Careers</a> : null}
                      </div>
                    </section>

                    {companyProfile && (companyProfile.coreValues || companyProfile.foundingStory || companyProfile.vision) ? (
                      <section className="company-more">
                        {/* <div className="section-title">More</div> */}
                        <div className="section-body">
                          {companyProfile.foundingStory ? (<><div className="more-heading">Founding story</div><div className="more-body">{companyProfile.foundingStory}</div></>) : null}
                          {companyProfile.mission ? (<><div className="more-heading">Mission</div><div className="more-body">{companyProfile.mission}</div></>) : null}
                          {companyProfile.vision ? (<><div className="more-heading">Vision</div><div className="more-body">{companyProfile.vision}</div></>) : null}
                          {companyProfile.coreValues && Array.isArray(companyProfile.coreValues) ? (<><div className="more-heading">Core values</div><div className="more-body">{companyProfile.coreValues.join(', ')}</div></>) : null}
                        </div>
                      </section>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowCompanyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <DocumentPreviewModal 
        open={previewOpen} 
        url={previewUrlState} 
        title={previewTitle} 
        onClose={() => setPreviewOpen(false)} 
      />

    </div>
  );
}

export default Jobs;

