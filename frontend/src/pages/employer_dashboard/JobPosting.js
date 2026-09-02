import React, { useState, useRef, useEffect } from 'react';
import { COUNTRIES as ALL_COUNTRIES } from '../../data/countries';
import { useJobs } from '../../contexts/JobsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../components/ToastProvider';
import './JobPosting.css';

export default function EmployerJobs() {
  const { addJob } = useJobs();
  const { profile, userId, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    title: '',
    company: '',
    category: '',
    type: '',
    status: 'Active',
    summary: '',
    description: '',
    responsibilities: '',
    requirements: '',
    preferred: '',
    skills: '',
    experienceLevel: '',
    educationLevel: '',
  minSalary: '',
  maxSalary: '',
  currency: '',
  salaryFrequency: 'annual',
    benefits: '',
    location: '',
    workArrangement: 'remote',
    deadline: '',
    numberOpenings: 1,
    applicationMethod: 'internal', // internal | external | email
    applicationTarget: '',
    postedDate: new Date().toISOString().slice(0,10),
    expirationDate: '',
    logoName: '',
  });
  // employer posted jobs UI state
  const [postedJobs, setPostedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const filtersRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null); // 'status' | 'date' | null
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | closed
  const [datePosted, setDatePosted] = useState(null); // null | '7d' | '30d' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  async function loadPostedJobs() {
    // allow using userId from auth even if full profile hasn't loaded yet
    if (!profile && !userId) return;
    setLoadingJobs(true);
    try {
      const employerId = (profile && (profile.userId || profile._id)) || userId;
      const base = process.env.REACT_APP_API_BASE || '';
      const res = await fetch(`${base}/api/jobs?createdBy=${encodeURIComponent(employerId)}`);
      if (res.ok) {
        const data = await res.json();
        // if no jobs were returned for this creator, attempt a fallback:
        // fetch all jobs and include ones that either have no createdBy or match the employer's company name
        if ((!data || data.length === 0) && profile && profile.company) {
          try {
            const allRes = await fetch(`${base}/api/jobs`);
            if (allRes.ok) {
              const allJobs = await allRes.json();
              const filtered = (allJobs || []).filter(j => {
                // include jobs explicitly created by this employer OR jobs without createdBy that match company
                if (j.createdBy) return String(j.createdBy) === String(employerId);
                return String((j.company || '').trim()).toLowerCase() === String((profile.company || '').trim()).toLowerCase();
              });
              setPostedJobs(filtered || []);
              if (filtered && filtered.length && !selectedJobId) setSelectedJobId(filtered[0]._id || filtered[0].id);
            } else {
              setPostedJobs([]);
            }
          } catch (e) {
            console.warn('Fallback fetch all jobs failed', e);
            setPostedJobs([]);
          }
        } else {
          setPostedJobs(data || []);
          if (data && data.length && !selectedJobId) setSelectedJobId(data[0]._id || data[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load posted jobs', err);
    } finally {
      setLoadingJobs(false);
    }
  }

  // reload posted jobs when profile or userId changes (userId may be set before full profile loads)
  useEffect(() => { loadPostedJobs(); }, [profile, userId]);

  // When profile becomes available, and we're not editing an existing job,
  // prefill the company field so the job posting form shows the employer name.
  useEffect(() => {
    if (!profile) return;
    const defaultCompany = (profile.companyName || profile.company || '');
    // derive a sensible default location from profile fields
    let defaultLocation = profile.location || profile.companyLocation || '';
    if (!defaultLocation) {
      const parts = [];
      if (profile.city) parts.push(profile.city);
      if (profile.stateOrProvince || profile.state) parts.push(profile.stateOrProvince || profile.state);
      if (profile.country) parts.push(profile.country);
      defaultLocation = parts.join(', ');
    }

    // only set when not editing an existing job and fields are empty
    if (!selectedJobId) {
      setForm(prev => {
        const next = { ...prev };
        if (!prev.company || prev.company === '') next.company = defaultCompany;
        if (!prev.location || prev.location === '') next.location = defaultLocation;
        return next;
      });
    }
  }, [profile, selectedJobId]);

  // sync the structured city/state/country fields when workArrangement changes
  useEffect(() => {
    // when switching to remote, clear structured location fields
    if (form.workArrangement === 'remote') {
      setCity('');
      setStateOrProvince('');
      setCountry('');
      // also clear freeform location so it's hidden/unused
      setForm(prev => ({ ...prev, location: '' }));
      return;
    }

    // for hybrid or onsite, prefill from profile when available and when not editing an existing job
    if ((form.workArrangement === 'hybrid' || form.workArrangement === 'onsite') && profile && !selectedJobId) {
      // 💡 MODIFIED: Prioritize company-specific location fields for structured location inputs
      if (profile.companyCity || profile.companyRegion || profile.companyCountry || profile.location || profile.companyLocation) {
        setCity(profile.companyCity || profile.city || '');
        setStateOrProvince(profile.companyRegion || profile.stateOrProvince || profile.state || '');
        setCountry(profile.companyCountry || profile.country || '');
      }
      // also ensure the freeform location string in in sync when possible
      setForm(prev => {
        if (prev.location && prev.location.trim()) return prev;
        const parts = [];
        // 💡 MODIFIED: Use company-specific fields for composing the freeform location
        if (profile.companyCity) parts.push(profile.companyCity);
        else if (profile.city) parts.push(profile.city);
        
        if (profile.companyRegion) parts.push(profile.companyRegion);
        else if (profile.stateOrProvince || profile.state) parts.push(profile.stateOrProvince || profile.state);
        
        if (profile.companyCountry) parts.push(profile.companyCountry);
        else if (profile.country) parts.push(profile.country);
        
        const composed = parts.join(', ');
        return { ...prev, location: composed };
      });
    }
  }, [form.workArrangement, profile, selectedJobId]);

  // If the URL contains a ?selected=ID query param, select that job when the list loads
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const sel = params.get('selected');
      if (sel) {
        // if postedJobs already contains it, select immediately; otherwise selection will persist after load
        const exists = (postedJobs || []).some(j => (j._id || j.id) === sel);
        if (exists) setSelectedJobId(sel);
        else {
          // attempt to set it anyway — loadPostedJobs may overwrite, but we prefer explicit selection
          setSelectedJobId(sel);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [location.search, postedJobs]);

  // close action menu when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // close filter dropdowns when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setOpenDropdown(null);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  async function archiveJob(id) {
    if (!id) return;
    if (!window.confirm('Archive this job? It will be marked closed.')) return;
    try {
      const base = process.env.REACT_APP_API_BASE || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${base}/api/jobs/${encodeURIComponent(id)}`, { method: 'PUT', headers, body: JSON.stringify({ status: 'Closed' }) });
      if (res.ok) {
        toast.success('Job archived');
        setOpenMenuId(null);
        await loadPostedJobs();
      } else {
        const txt = await res.text();
        toast.error('Failed to archive job: ' + txt);
      }
    } catch (e) {
      console.error('Archive error', e);
      toast.error('Failed to archive job');
    }
  }


  async function deleteJob(id) {
    // legacy placeholder - this function is kept for direct deletion
    // prefer calling confirm flow (open modal) which will call performDelete
    if (!id) return;
    await performDelete(id);
  }

  const [jobToDelete, setJobToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // repost modal state
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostJobId, setRepostJobId] = useState(null);
  const [repostExpirationInput, setRepostExpirationInput] = useState('');
  const [repostDeadlineInput, setRepostDeadlineInput] = useState(''); // *** 1. ADD NEW STATE ***
  const [repostOpenings, setRepostOpenings] = useState(1);

  // open confirmation modal for deletion
  function confirmDelete(id) {
    setJobToDelete(id);
    setOpenMenuId(null);
  }

  async function performDelete(id) {
    if (!id) return;
    setIsDeleting(true);
    try {
      const base = process.env.REACT_APP_API_BASE || '';
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${base}/api/jobs/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success('Job deleted');
        // refresh list from server if possible
        await loadPostedJobs();
      } else {
        // fallback: remove locally
        const txt = await res.text();
        console.warn('Delete failed', txt);
        setPostedJobs(prev => prev.filter(j => (j._id||j.id) !== id));
        toast.success('Job removed locally');
      }
    } catch (e) {
      console.error('Delete error', e);
      // fallback local removal
      setPostedJobs(prev => prev.filter(j => (j._id||j.id) !== id));
      toast.error('Failed to delete job from server; removed locally');
    } finally {
      setIsDeleting(false);
      setJobToDelete(null);
    }
  }
  const [city, setCity] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [country, setCountry] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryHighlight, setCountryHighlight] = useState(0);
  const countryInputRef = useRef(null);
  const toggleRefs = useRef({ remote: null, hybrid: null, onsite: null });


  const [logoPreview, setLogoPreview] = useState('');
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [postedId, setPostedId] = useState(null);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const [serverConfirmed, setServerConfirmed] = useState(false);
  const toast = useToast();

  const onChange = (e) => {
    const { name, value, type } = e.target;
    // keep number fields empty when cleared (don't coerce empty string to 0)
    if (type === 'number') {
      const v = value === '' ? '' : Number(value);
      setForm({ ...form, [name]: v });
    } else setForm({ ...form, [name]: value });
    // clear error for the field while typing
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setForm(prev => ({ ...prev, logoName: f.name }));
    // create local preview (not uploaded)
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const onRemoveLogo = () => {
    setLogoPreview('');
    setForm(prev => ({ ...prev, logoName: '' }));
    // clear the hidden file input if present
    if (formRef.current) {
      const fileInput = formRef.current.querySelector('input[type="file"]#logo-upload');
      if (fileInput) {
        try {
          fileInput.value = null;
        } catch (e) {
          // fallback: replace the node
          const replacement = fileInput.cloneNode(true);
          replacement.addEventListener && replacement.addEventListener('change', onFileChange);
          fileInput.parentNode && fileInput.parentNode.replaceChild(replacement, fileInput);
        }
      }
    }
  };

  // open the repost modal (collect expiration and openings)
  function repostJob(id) {
    if (!id) return;
    setRepostJobId(id);
    setRepostExpirationInput('');
    setRepostDeadlineInput(''); // *** 3. RESET NEW STATE ***
    setRepostOpenings(1);
    setRepostModalOpen(true);
  }

  // *** 4. UPDATE CONFIRM REPOST LOGIC ***
 
  async function confirmRepost() {
    const id = repostJobId;
    if (!id) return;

    const openings = Number(repostOpenings) || 1;
    let expirationDate = null;

    // --- Parse Expiration Date ---
    if (repostExpirationInput && String(repostExpirationInput).trim()) {
      const trimmed = String(repostExpirationInput).trim();
      const asInt = parseInt(trimmed, 10);
      if (!isNaN(asInt) && String(asInt) === trimmed) {
        // Input is a number of days
        const d = new Date();
        d.setDate(d.getDate() + asInt);
        expirationDate = d.toISOString().slice(0, 10);
      } else {
        // Input is a date string
        const cand = new Date(trimmed);
        if (!isNaN(cand.getTime())) {
          expirationDate = cand.toISOString().slice(0, 10);
        } else {
          alert('Could not parse the expiration date. Use YYYY-MM-DD or a number of days.');
          return;
        }
      }
    }

    // --- Parse NEW Deadline ---
    // The input is type="date", so the value is already 'YYYY-MM-DD' or empty string.
    const deadline = repostDeadlineInput.trim() ? repostDeadlineInput.trim() : null;

    try {
      if (!token) {
        toast.error('You must be signed in to re-post a job');
        return;
      }

      const base = process.env.REACT_APP_API_BASE || '';
      const url = `${base}/api/jobs/${encodeURIComponent(id)}`;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const today = new Date().toISOString().slice(0, 10);
      const body = {
        status: 'Active',
        numberOpenings: openings,
        expirationDate: expirationDate || null,
        deadline: deadline || null, // Use the new 'deadline' variable
        applicationDeadline: deadline || null, // <<< *** FIX 1: Add applicationDeadline to API request ***
        postedDate: today,
        updatedAt: today
      };

      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });

      if (res.ok) {
        setPostedJobs(prev => (prev || []).map(j => {
          const jid = j._id || j.id || j.jobId || '';
          if (String(jid) === String(id)) {
            return {
              ...j,
              status: 'Active',
              numberOpenings: openings,
              expirationDate, // Set expiration date
              deadline: deadline, // Set new deadline
              applicationDeadline: deadline // <<< *** FIX 2: Add applicationDeadline to local state ***
            };
          }
          return j;
        }));
        toast.success('Job re-posted');
        setOpenMenuId(null);
        setRepostModalOpen(false);
        setRepostJobId(null);
        await loadPostedJobs();
      } else {
        const txt = await res.text();
        console.warn('confirmRepost failed', { status: res.status, text: txt });
        toast.error('Failed to re-post job: ' + txt);
      }
    } catch (e) {
      console.error('Repost error', e);
      toast.error('Failed to re-post job');
    }
  }


  // friendly formatter for application method and dates
  function formatMethod(m) {
    if (!m) return 'Internal';
    const v = String(m).toLowerCase();
    if (v === 'internal') return 'Internal';
    if (v === 'external') return 'External';
    if (v === 'email') return 'Email';
    // fallback: title case
    return v.replace(/(^|\s)\S/g, t => t.toUpperCase());
  }

  function formatDateString(d) {
    if (!d) return '';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return String(d);
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function validate() {
    const next = {};
    if (!form.title || !form.title.trim()) next.title = 'Job title is required';
    if (!form.company || !form.company.trim()) next.company = 'Company name is required';
    if (!form.numberOpenings || Number(form.numberOpenings) < 1) next.numberOpenings = 'Enter at least 1 opening';

    const minVal = form.minSalary === '' ? null : Number(form.minSalary);
    const maxVal = form.maxSalary === '' ? null : Number(form.maxSalary);
    if (minVal !== null || maxVal !== null) {
      if (minVal === null || isNaN(minVal)) next.minSalary = 'Enter a valid minimum salary';
      if (maxVal === null || isNaN(maxVal)) next.maxSalary = 'Enter a valid maximum salary';
      if ((minVal !== null && maxVal !== null) && minVal > maxVal) next.minSalary = 'Minimum must be less than or equal to maximum';
      if (!form.currency || !form.currency.trim()) next.currency = 'Select a currency';
      if (!form.salaryFrequency) next.salaryFrequency = 'Select frequency';
    }

    if (form.applicationMethod === 'external') {
      if (!form.applicationTarget || !form.applicationTarget.trim()) next.applicationTarget = 'Application URL is required for External Link';
      else if (!isValidUrl(form.applicationTarget)) next.applicationTarget = 'Enter a valid URL';
    }
    if (form.applicationMethod === 'email') {
      if (!form.applicationTarget || !form.applicationTarget.trim()) next.applicationTarget = 'Application email is required for Email method';
      else if (!isValidEmail(form.applicationTarget)) next.applicationTarget = 'Enter a valid email address';
    }

    if (form.workArrangement === 'onsite' || form.workArrangement === 'hybrid') {
      if (!city || !city.trim()) next.city = 'City is required for on-site roles';
      if (!stateOrProvince || !stateOrProvince.trim()) next.stateOrProvince = 'Province/State is required for on-site roles';
      if (!country || !country.trim()) next.country = 'Country is required for on-site roles';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault?.();
    const ok = validate();
    if (!ok) {
      // wait a tick for errors to render, then focus
      setTimeout(() => focusFirstError(), 50);
      return; // errors set via validate()
    }
  // try to upload logo if a file was selected in the file input
    let uploadedLogo = null;
    try {
      if (formRef.current) {
        const fileInput = formRef.current.querySelector('input[type="file"]');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const f = fileInput.files[0];
          const fd = new FormData();
          fd.append('logo', f);
          const res = await fetch('/api/uploads/logo', { method: 'POST', body: fd });
          if (res.ok) uploadedLogo = await res.json();
          else console.warn('Logo upload failed', await res.text());
        }
      }
    } catch (err) {
      console.warn('Logo upload error', err);
      // continue without blocking job creation
    }

  // helper to convert textarea / comma-separated strings into arrays
    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') return v.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      return [];
    };

    // preserve existing logo when editing if no new upload was performed
    let existingLogoUrl = null;
    let existingLogoName = null;
    if (selectedJobId) {
      const existingJob = (postedJobs || []).find(j => (j._id||j.id) === selectedJobId) || {};
      existingLogoUrl = existingJob.logoUrl || existingJob.logo || null;
      existingLogoName = existingJob.logoName || null;
    }
    const defaultLogoUrl = !selectedJobId ? logoPreview : null;

    // prepare payload — include key fields expected by backend/context
    const payload = {
      title: form.title,
      company: form.company,
      category: form.category,
      type: form.type,
      status: form.status,
      description: form.description,
  responsibilities: toArray(form.responsibilities),
  requirements: toArray(form.requirements),
  preferred: form.preferred,
  skills: toArray(form.skills),
      experienceLevel: form.experienceLevel,
      educationLevel: form.educationLevel,
  minSalary: form.minSalary === '' ? null : Number(form.minSalary),
  maxSalary: form.maxSalary === '' ? null : Number(form.maxSalary),
  currency: form.currency,
    salaryFrequency: form.salaryFrequency,
  benefits: toArray(form.benefits),
  // prefer structured onsite/hybrid fields when provided
  location: (form.workArrangement === 'onsite' || form.workArrangement === 'hybrid') ? `${city}${stateOrProvince ? ', ' + stateOrProvince : ''}${country ? ', ' + country : ''}` : form.location,
  city: (form.workArrangement === 'onsite' || form.workArrangement === 'hybrid') ? city : null,
  stateOrProvince: (form.workArrangement === 'onsite' || form.workArrangement === 'hybrid') ? stateOrProvince : null,
  country: (form.workArrangement === 'onsite' || form.workArrangement === 'hybrid') ? country : null,
      workArrangement: form.workArrangement,
      numberOpenings: form.numberOpenings,
      applicationMethod: form.applicationMethod,
      applicationTarget: form.applicationTarget,
      deadline: form.deadline,
      postedAt: form.postedDate,
      expirationDate: form.expirationDate,
      // prefer newly uploaded logo, otherwise preserve existing logo when editing
      logoName: uploadedLogo?.name || form.logoName || existingLogoName || null,
      logoUrl: uploadedLogo?.url || existingLogoUrl || defaultLogoUrl || null,
    };

    // add a few explicit flags so backend stores convenient booleans
    payload.easyApply = !!form.easyApply;
    payload.isRemote = form.workArrangement === 'remote';
    payload.isHybrid = form.workArrangement === 'hybrid';
    payload.isFullTime = !!(form.type && form.type.toLowerCase().includes('full'));
    payload.exclusive = !!form.exclusive;
    payload.applied = false;

    try {
      // attach current employer id so the job is saved to their account
      // prefer profile.userId/_id but fall back to top-level userId from AuthContext
      if ((profile && (profile.userId || profile._id)) || userId) payload.createdBy = (profile && (profile.userId || profile._id)) || userId;
      let savedJob = null;
      let fromServer = false;
      if (selectedJobId) {
        // update existing job via PUT
        const base = process.env.REACT_APP_API_BASE || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${base}/api/jobs/${encodeURIComponent(selectedJobId)}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        if (res.ok) {
          savedJob = await res.json();
          fromServer = true;
        } else {
          console.warn('Failed to update job', await res.text());
        }
      } else {
        const res = await addJob(payload);
        if (res && res.job) {
          savedJob = res.job;
          fromServer = !!res.fromServer;
        }
      }

      // refresh the employer job list and select the updated/created job
      await loadPostedJobs();
      let id = null;
      if (savedJob) {
        id = savedJob._id || savedJob.id || savedJob.id;
        setSelectedJobId(id);
        setPostedId(id);
      }

      // navigate employer after save/post
      try {
        if (selectedJobId) {
          // when editing an existing job, reload to the Job Listings page with the selected id
          // use a full page navigation so the listing is loaded fresh
          window.location.href = `/employer/JobPosting?selected=${id}`;
        } else {
          // after creating a new job, go to applicants so employer can view applicants
          navigate('/employer/applicants');
        }
      } catch (e) { /* ignore navigation errors */ }

      if (fromServer) {
        setServerConfirmed(true);
        toast.success('Job posted successfully');
        setTimeout(() => setServerConfirmed(false), 5000);
      } else {
        // local fallback — show only inline minor banner
        setPostedSuccess(true);
        toast.success('Job posted (local fallback)');
        setTimeout(() => setPostedSuccess(false), 4000);
      }
    } catch (e) {
      const msg = (e && e.message) || 'Failed to post job';
      toast.error(msg);
    }

    // reset form after posting
    setForm({
      title: '',
      company: '',
      category: '',
      type: '',
      status: 'Active',
      summary: '',
      description: '',
      responsibilities: '',
      requirements: '',
      preferred: '',
      skills: '',
      experienceLevel: '',
      educationLevel: '',
  minSalary: '',
  maxSalary: '',
  currency: '',
  salaryFrequency: 'annual',
      benefits: '',
      location: '',
      workArrangement: 'remote',
      deadline: '',
      numberOpenings: 1,
      applicationMethod: 'internal',
      applicationTarget: '',
      postedDate: new Date().toISOString().slice(0,10),
      expirationDate: '',
      logoName: '',
    });
    setCity('');
    setStateOrProvince('');
    setCountry('');
    setCountryQuery('');
    setLogoPreview('');
  }

  // toast is provided by ToastProvider

  // handle arrow navigation for segmented control
  function handleToggleKey(e) {
    const order = ['remote','hybrid','onsite'];
    const idx = order.indexOf(form.workArrangement);
    if (e.key === 'ArrowRight') {
      const next = order[(idx + 1) % order.length];
      setForm(prev => ({ ...prev, workArrangement: next }));
      setTimeout(() => toggleRefs.current[next]?.focus?.(), 0);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      const next = order[(idx - 1 + order.length) % order.length];
      setForm(prev => ({ ...prev, workArrangement: next }));
      setTimeout(() => toggleRefs.current[next]?.focus?.(), 0);
      e.preventDefault();
    }
  }

  const onCountryInput = (v) => {
    setCountryQuery(v);
    setShowCountryDropdown(true);
    setCountry(v);
    setCountryHighlight(0);
  };

  const filteredCountries = ALL_COUNTRIES.filter(c => c.toLowerCase().includes((countryQuery || country).toLowerCase()));

  function selectCountry(c) {
    setCountry(c);
    setCountryQuery(c);
    setShowCountryDropdown(false);
    setCountryHighlight(0);
  }

  function handleCountryKey(e) {
    if (!showCountryDropdown) return;
    if (e.key === 'ArrowDown') {
      setCountryHighlight(prev => Math.min(prev + 1, filteredCountries.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setCountryHighlight(prev => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const sel = filteredCountries[countryHighlight];
      if (sel) selectCountry(sel);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setShowCountryDropdown(false);
      e.preventDefault();
    }
  }

  // If validate() fails, call this to focus and scroll to the first invalid field
  function focusFirstError() {
    const keys = Object.keys(errors || {});
    if (!keys.length) return;
    const first = keys[0];
    // try to find inside the form first
    let el = null;
    if (formRef.current) el = formRef.current.querySelector(`[name="${first}"]`);
    if (!el) el = document.querySelector(`[name="${first}"]`);
    if (el && typeof el.focus === 'function') {
      el.focus();
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
    }
  }

  return (
    <div className="employer-applicants-root">
      <div className="card job-posts" style={{ width: 360, flex: '0 0 360px' }}>
        <div className="card-header">
          <div style={{ fontWeight:700 }}>Jobs Posted ({postedJobs.length})</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="jobposting-btn" onClick={() => {
              // when opening the new job form, prefill company and location from the employer profile
              const defaultCompany = (profile && (profile.companyName || profile.company)) || '';
              let defaultLocation = '';
              if (profile) {
                defaultLocation = profile.location || profile.companyLocation || '';
                if (!defaultLocation) {
                  const parts = [];
                  if (profile.city) parts.push(profile.city);
                  if (profile.stateOrProvince || profile.state) parts.push(profile.stateOrProvince || profile.state);
                  if (profile.country) parts.push(profile.country);
                  defaultLocation = parts.join(', ');
                }
              }
              setShowForm(true);
              setSelectedJobId(null);
              setForm({ title:'', company: defaultCompany, category:'', type:'', status:'Active', summary:'', description:'', responsibilities:'', requirements:'', preferred:'', skills:'', experienceLevel:'', educationLevel:'', minSalary:'', maxSalary:'', currency:'', salaryFrequency:'annual', benefits:'', location: defaultLocation, workArrangement:'remote', deadline:'', numberOpenings:1, applicationMethod:'internal', applicationTarget:'', postedDate:new Date().toISOString().slice(0,10), expirationDate:'', logoName:'' });
              // prefill structured location fields too — they will be shown when the user selects hybrid/onsite
              if (profile) {
                setCity(profile.city || '');
                setStateOrProvince(profile.stateOrProvince || profile.state || '');
                setCountry(profile.country || '');
                // 💡 ADDED: Set the default logo from the profile
                setLogoPreview(profile.companyLogo || ''); 
              } else {
                setCity('');
                setStateOrProvince('');
                setCountry('');
                // 💡 ADDED: Ensure logo is cleared if no profile is available
                setLogoPreview('');
              }
            }}>Post New Job</button>
          </div>
        </div>
          <div className="card-body list-body">
            <div className="jobs-filters" ref={filtersRef} style={{ marginBottom: 8 }}>
              {/* Status filter */}
              <div className={`jobs-filter-wrap ${statusFilter && statusFilter !== 'all' ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${statusFilter && statusFilter !== 'all' ? 'active' : ''} ${openDropdown === 'status' ? 'open' : ''}`} onClick={(e) => { 
                  e.stopPropagation();
                  // if a status filter is active and the dropdown isn't open, clear the filter on second click
                  if (statusFilter && statusFilter !== 'all' && openDropdown !== 'status') {
                    setStatusFilter('all');
                    setOpenDropdown(null);
                    return;
                  }
                  setOpenDropdown(openDropdown === 'status' ? null : 'status');
                }}>
                  <span>Status</span>
                  <svg className="jobs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {openDropdown === 'status' && (
                  <div className="jobs-dropdown-menu">
                    <label className="jobs-dropdown-item"><input type="radio" name="status" checked={statusFilter === 'all'} onChange={() => setStatusFilter('all')} /> All</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="status" checked={statusFilter === 'active'} onChange={() => setStatusFilter('active')} /> Active / Open</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="status" checked={statusFilter === 'closed'} onChange={() => setStatusFilter('closed')} /> Closed / Filled</label>
                  </div>
                )}
              </div>

              {/* Date Posted filter */}
              <div className={`jobs-filter-wrap ${datePosted ? 'active' : ''}`}>
                <button className={`jobs-filter-pill ${datePosted ? 'active' : ''} ${openDropdown === 'date' ? 'open' : ''}`} onClick={(e) => { 
                  e.stopPropagation();
                  // if a date filter is selected and the dropdown isn't open, clear date filter on second click
                  if (datePosted && openDropdown !== 'date') {
                    setDatePosted(null);
                    setCustomStart('');
                    setCustomEnd('');
                    setOpenDropdown(null);
                    return;
                  }
                  setOpenDropdown(openDropdown === 'date' ? null : 'date');
                }}>
                  <span>Date Posted</span>
                  <svg className="jobs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {openDropdown === 'date' && (
                  <div className="jobs-dropdown-menu">
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === '7d'} onChange={() => setDatePosted('7d')} /> Last 7 days</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === '30d'} onChange={() => setDatePosted('30d')} /> Last 30 days</label>
                    <label className="jobs-dropdown-item"><input type="radio" name="date" checked={datePosted === 'custom'} onChange={() => setDatePosted('custom')} /> Custom range</label>
                    {datePosted === 'custom' && (
                      <div style={{ padding: '8px 10px', display: 'grid', gap: 8 }}>
                        <label className="jobs-dropdown-item">Start: <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label>
                        <label className="jobs-dropdown-item">End: <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          {loadingJobs ? <div className="empty">Loading…</div> : (() => {
            const filteredPostedJobs = (postedJobs || []).filter(j => {
              // status filter
              const now = new Date();
              const deadline = j.deadline || j.applicationDeadline || j.expirationDate || j.expireAt || null;
              const deadlineDate = deadline ? new Date(deadline) : null;
              const isClosed =
                (j.status && j.status.toLowerCase() === 'closed') ||
                (deadlineDate && !isNaN(deadlineDate.getTime()) && deadlineDate < now);

              if (statusFilter === 'active' && isClosed) return false;
              if (statusFilter === 'closed' && !isClosed) return false;

              // date posted filter
              if (datePosted) {
                const posted = new Date(j.postedAt || j.postedDate || j.posted || j.createdAt || null);
                if (isNaN(posted.getTime())) return false;
                const diffDays = (new Date() - posted) / (1000 * 60 * 60 * 24);
                if (datePosted === '7d' && diffDays > 7) return false;
                if (datePosted === '30d' && diffDays > 30) return false;
                if (datePosted === 'custom' && customStart && customEnd) {
                  const s = new Date(customStart);
                  const e = new Date(customEnd);
                  if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
                  if (posted < s || posted > new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59)) return false;
                }
              }

              return true;
            });

            if (!filteredPostedJobs || filteredPostedJobs.length === 0) return <div className="empty">No jobs posted yet</div>;
            return filteredPostedJobs.map(j => (
              <div key={j._id || j.id} className={`job-item ${selectedJobId === (j._id||j.id) ? 'active' : ''}`} onClick={() => { setSelectedJobId(j._id||j.id); setShowForm(false); }}>
                <div className="job-item-left">
                  <div className="job-avatar">
                    { (j.logoUrl || j.logo) ? (
                      <img src={j.logoUrl || j.logo} alt={`${j.company || 'Company'} logo`} />
                    ) : null }
                  </div>
                </div>
                <div className="job-item-body">
                  <div>
                    <div className="job-title">{j.title}</div>
                    {/* <div className="job-company">{j.company}</div> */}
                    <div className="job-location">{j.location || j.city || ''}</div>
                  </div>
                  {/* <div className="job-footer">Applicants: {j.applicantsCount || '0'}</div> */}
                </div>
                <div className="job-actions-right">
                  <button
                    className="wc-btn wc-btn-ghost"
                    aria-haspopup="true"
                    aria-expanded={openMenuId === (j._id||j.id)}
                    onClick={(ev) => { ev.stopPropagation(); setOpenMenuId(openMenuId === (j._id||j.id) ? null : (j._id||j.id)); }}
                  >
                    ⋯
                  </button>
                  {openMenuId === (j._id||j.id) && (
                    <div ref={menuRef} className="job-action-menu">
                      { (j.status && String(j.status).toLowerCase() === 'closed') ? (
                        <>
                          <button className="job-menu-item" onClick={(ev) => { ev.stopPropagation(); repostJob(j._id||j.id); }}>Re-post</button>
                          <button className="job-menu-item danger" onClick={(ev) => { ev.stopPropagation(); confirmDelete(j._id||j.id); }}>Delete</button>
                        </>
                      ) : (
                        <>
                          <button className="job-menu-item" onClick={(ev) => { ev.stopPropagation(); archiveJob(j._id||j.id); }}>Archive</button>
                          <button className="job-menu-item danger" onClick={(ev) => { ev.stopPropagation(); confirmDelete(j._id||j.id); }}>Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

  <div className="card applicants-panel">
        <div className="card-header">
          <div style={{ fontWeight:700 }}>{showForm ? (selectedJobId ? 'Edit Job' : 'Post a New Job') : 'Job Details'}</div>
          <div className="header-actions">
            {!showForm && selectedJobId && (
              <button className="wc-btn" onClick={() => {
                // populate form for edit
                const job = postedJobs.find(j => (j._id||j.id) === selectedJobId) || {};
                setForm({
                  title: job.title || '',
                  company: job.company || '',
                  category: job.category || '',
                  type: job.type || '',
                  status: job.status || 'Active',
                  summary: job.summary || '',
                  description: job.description || '',
                  responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : (job.responsibilities || ''),
                  requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : (job.requirements || ''),
                  preferred: job.preferred || '',
                  skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''),
                  experienceLevel: job.experienceLevel || '',
                  educationLevel: job.educationLevel || '',
                  minSalary: job.minSalary == null ? '' : job.minSalary,
                  maxSalary: job.maxSalary == null ? '' : job.maxSalary,
                  currency: job.currency || '',
                  salaryFrequency: job.salaryFrequency || 'annual',
                  benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : (job.benefits || ''),
                  location: job.location || '',
                  workArrangement: job.workArrangement || (job.location ? 'onsite' : 'remote'),
                  deadline: job.deadline || job.applicationDeadline || '',
                  numberOpenings: job.numberOpenings || job.openings || 1,
                  applicationMethod: job.applicationMethod || 'internal',
                  applicationTarget: job.applicationTarget || '',
                  postedDate: (job.postedAt || job.postedDate || new Date().toISOString().slice(0,10)).toString().slice(0,10),
                  expirationDate: job.expirationDate || '',
                  logoName: job.logoName || '',
                });
                setCity(job.city || '');
                setStateOrProvince(job.stateOrProvince || job.state || '');
                setCountry(job.country || '');
                setLogoPreview(job.logoUrl || '');
                setShowForm(true);
              }}>Edit Job Post</button>
            )}
            
          </div>
        </div>
  <div className="card-body applicants-body">
          {showForm ? (
            <form className="jobposting-form" onSubmit={onSubmit} ref={formRef}>
              {/* 1. Basic Information */}
              <section className="jobposting-section">
                <h3>1. Basic Information</h3>
                <div className="jobposting-grid-2">
                  <div>
                    <label className="jobposting-small-label">Job Title</label>
                    <input name="title" placeholder="e.g. Senior Frontend Engineer" value={form.title} onChange={onChange} className={`jobposting-input ${errors.title ? 'invalid' : ''}`} />
                    {errors.title && <div className="jobposting-error">{errors.title}</div>}
                  </div>
                  <div>
                    <label className="jobposting-small-label">Company</label>
                    <input name="company" placeholder="e.g. Acme Co." value={form.company} onChange={onChange} className={`jobposting-input ${errors.company ? 'invalid' : ''}`} />
                    {errors.company && <div className="jobposting-error">{errors.company}</div>}
                  </div>
                  <div>
                    {/* <label className="jobposting-small-label">Employment Type</label> */}
                    <select name="type" value={form.type} onChange={onChange} className="jobposting-input">
                      <option value="">Employment Type</option>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div>
                    {/* <label className="jobposting-small-label">Job Category</label> */}
                    <select
                      name="category"
                      value={form.category}
                      onChange={onChange}
                      className="jobposting-input"
                    >
                      <option value="">Job Category</option>
                      <option>Accounting</option>
                      <option>Administrative / Office Support</option>
                      <option>Customer Service</option>
                      <option>Design</option>
                      <option>Education / Training</option>
                      <option>Engineering</option>
                      <option>Finance</option>
                      <option>Healthcare</option>
                      <option>Hospitality / Food Service</option>
                      <option>Human Resources</option>
                      <option>Information Technology (IT)</option>
                      <option>Legal</option>
                      <option>Manufacturing / Operations</option>
                      <option>Marketing</option>
                      <option>Product</option>
                      <option>Sales</option>
                      <option>Science / Research</option>
                      <option>Skilled Trades / Construction</option>
                      <option>Transportation / Logistics</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label className="jobposting-small-label">Work arrangement</label>
                    <div className="toggle-row" role="tablist" aria-label="Work arrangement" onKeyDown={handleToggleKey}>
                      <button
                        ref={el => toggleRefs.current.remote = el}
                        type="button"
                        className={`toggle-btn ${form.workArrangement === 'remote' ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, workArrangement: 'remote' }))}
                        aria-pressed={form.workArrangement === 'remote'}
                      >
                        Remote
                      </button>
                      <button
                        ref={el => toggleRefs.current.hybrid = el}
                        type="button"
                        className={`toggle-btn ${form.workArrangement === 'hybrid' ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, workArrangement: 'hybrid' }))}
                        aria-pressed={form.workArrangement === 'hybrid'}
                      >
                        Hybrid
                      </button>
                      <button
                        ref={el => toggleRefs.current.onsite = el}
                        type="button"
                        className={`toggle-btn ${form.workArrangement === 'onsite' ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, workArrangement: 'onsite' }))}
                        aria-pressed={form.workArrangement === 'onsite'}
                      >
                        On-site
                      </button>
                    </div>
                  </div>

                  {form.workArrangement === 'remote' ? (
                    // when remote, hide location inputs entirely
                    <div className="form-row" style={{ padding: 8, color: '#6b7280' }}>
                      <small>This is a remote role; location is not required.</small>
                    </div>
                  ) : (
                    <div className="location-grid">
                      <div className="form-row">
                        <label className="jobposting-small-label" htmlFor="city">City</label>
                        <input
                          id="city"
                          name="city"
                          className={`jobposting-input ${errors.city ? 'invalid' : ''}`}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Vancouver"
                        />
                        {errors.city && <div className="jobposting-error">{errors.city}</div>}
                      </div>
                      <div className="form-row">
                        <label className="jobposting-small-label" htmlFor="stateOrProvince">Province / State</label>
                        <input
                          id="stateOrProvince"
                          name="stateOrProvince"
                          className={`jobposting-input ${errors.stateOrProvince ? 'invalid' : ''}`}
                          value={stateOrProvince}
                          onChange={(e) => setStateOrProvince(e.target.value)}
                          placeholder="e.g. BC / California"
                        />
                        {errors.stateOrProvince && <div className="jobposting-error">{errors.stateOrProvince}</div>}
                      </div>
                      <div className="form-row" style={{ position: 'relative' }}>
                        <label className="jobposting-small-label" htmlFor="country">Country</label>
                        <input
                          id="country"
                          name="country"
                          ref={countryInputRef}
                          className={`jobposting-input wc-search ${errors.country ? 'invalid' : ''}`}
                          value={countryQuery || country}
                          onChange={(e) => onCountryInput(e.target.value)}
                          onKeyDown={handleCountryKey}
                          onFocus={() => setShowCountryDropdown(true)}
                          placeholder="e.g. Canada"
                          autoComplete="off"
                        />
                        {showCountryDropdown && filteredCountries.length > 0 && (
                          <ul className="country-dropdown" role="listbox" style={{ position: 'absolute', zIndex: 40, background: '#fff', border: '1px solid #e6e9ee', width: '100%', marginTop: 6, borderRadius: 8, maxHeight: 180, overflow: 'auto' }}>
                            {filteredCountries.map((c, i) => (
                              <li key={c}
                                role="option"
                                aria-selected={countryHighlight === i}
                                onMouseDown={(ev) => { ev.preventDefault(); selectCountry(c); }}
                                onMouseEnter={() => setCountryHighlight(i)}
                                style={{ padding: '8px 10px', background: countryHighlight === i ? '#f1f5f9' : '#fff', cursor: 'pointer' }}
                              >{c}</li>
                            ))}
                          </ul>
                        )}
                        {errors.country && <div className="jobposting-error">{errors.country}</div>}
                      </div>
                    </div>
                  )}

                  <div className="jobposting-flex">
                    <div style={{ flex: 1 }}>
                      <label className="jobposting-small-label">Company Logo (optional)</label>
                      <div className="logo-row">
                        <label className="jobposting-file" htmlFor="logo-upload" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M12 16V4" stroke="#0aa96f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 8l4-4 4 4" stroke="#0aa96f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="3" y="18" width="18" height="2" rx="1" fill="#0aa96f" />
                          </svg>
                          <span>Upload logo</span>
                        </label>
                        <input id="logo-upload" type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
                        <div className="logo-preview-wrap">
                          {logoPreview ? (
                            <img src={logoPreview} alt="logo" className="logo-preview" />
                          ) : (
                            <div className="logo-placeholder">No logo uploaded</div>
                          )}
                          {(logoPreview || form.logoName) && (
                            <button type="button" className="logo-remove-overlay" aria-label="Remove logo" onClick={onRemoveLogo}>
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Job Details */}
              <section className="jobposting-section">
                <h3>2. Job Details</h3>
                <div className="jobposting-grid">
                  <div>
                    <label className="jobposting-small-label">Job Description</label>
                    <textarea name="description" placeholder="e.g. We’re looking for a frontend engineer to build responsive UIs using React and TypeScript." value={form.description} onChange={onChange} className={`jobposting-textarea ${errors.description ? 'invalid' : ''}`} />
                    {errors.description && <div className="jobposting-error">{errors.description}</div>}
                  </div>
                  <div>
                    <label className="jobposting-small-label">Responsibilities</label>
                    <textarea name="responsibilities" placeholder="e.g. Lead frontend development; mentor junior engineers; ship features." value={form.responsibilities} onChange={onChange} className={`jobposting-textarea ${errors.responsibilities ? 'invalid' : ''}`} />
                    {errors.responsibilities && <div className="jobposting-error">{errors.responsibilities}</div>}
                  </div>
                  <div>
                    <label className="jobposting-small-label">Qualifications / Requirements</label>
                    <textarea name="requirements" placeholder="e.g. 5+ years experience with JavaScript/React; strong CSS skills." value={form.requirements} onChange={onChange} className={`jobposting-textarea ${errors.requirements ? 'invalid' : ''}`} />
                    {errors.requirements && <div className="jobposting-error">{errors.requirements}</div>}
                  </div>
                  <div>
                    <label className="jobposting-small-label">Skills</label>
                    <input name="skills" placeholder="e.g. JavaScript, React, CSS" value={form.skills} onChange={onChange} className="jobposting-input" />
                  </div>
                  <div className="jobposting-flex">
                    <div style={{ flex: 1 }}>
                      {/* <label className="jobposting-small-label">Experience Level</label> */}
                      <select name="experienceLevel" value={form.experienceLevel} onChange={onChange} className="jobposting-input">
                      <option value="">Experience Level</option>
                      <option>Entry</option>
                      <option>Mid</option>
                      <option>Senior</option>
                    </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      {/* <label className="jobposting-small-label">Education Level</label> */}
                      <select
                        name="educationLevel"
                        value={form.educationLevel}
                        onChange={onChange}
                        className="jobposting-input"
                      >
                        <option value="">Education Level</option>
                        <option>None</option>
                        <option>High School Diploma or Equivalent (GED)</option>
                        <option>Vocational / Technical Certification</option>
                        <option>Some College, No Degree</option>
                        <option>Associate's Degree</option>
                        <option>Bachelor's Degree</option>
                        <option>Master's Degree</option>
                        <option>Doctorate (Ph.D., Ed.D.)</option>
                        <option>Professional Degree (M.D., J.D.)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Compensation */}
              <section className="jobposting-section">
                <h3>3. Compensation</h3>
                <div className="jobposting-grid">
                  <div className="salary-row">
                    <div>
                      <label className="jobposting-small-label">Min Salary</label>
                      <input type="number" name="minSalary" placeholder="e.g. 50000" value={form.minSalary} onChange={onChange} className={`jobposting-input ${errors.minSalary ? 'invalid' : ''}`} />
                      {errors.minSalary && <div className="jobposting-error">{errors.minSalary}</div>}
                    </div>
                    <div>
                      <label className="jobposting-small-label">Max Salary</label>
                      <input type="number" name="maxSalary" placeholder="e.g. 80000" value={form.maxSalary} onChange={onChange} className={`jobposting-input ${errors.maxSalary ? 'invalid' : ''}`} />
                      {errors.maxSalary && <div className="jobposting-error">{errors.maxSalary}</div>}
                    </div>
                    <div>
                      <label className="jobposting-small-label">Currency</label>
                      <select name="currency" value={form.currency} onChange={onChange} className={`jobposting-input ${errors.currency ? 'invalid' : ''}`}>
                        <option value="">Currency</option>
                        <option>USD</option>
                        <option>PHP</option>
                      </select>
                      {errors.currency && <div className="jobposting-error">{errors.currency}</div>}
                    </div>
                    <div>
                      <label className="jobposting-small-label">Frequency</label>
                      <select name="salaryFrequency" value={form.salaryFrequency} onChange={onChange} className={`jobposting-input ${errors.salaryFrequency ? 'invalid' : ''}`}>
                        <option value="annual">Annual</option>
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                      {errors.salaryFrequency && <div className="jobposting-error">{errors.salaryFrequency}</div>}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="jobposting-small-label">Benefits</label>
                    <textarea name="benefits" placeholder="e.g. Health insurance, 401(k), Flexible PTO" value={form.benefits} onChange={onChange} className="jobposting-textarea" />
                  </div>
                </div>
              </section>

              {/* 4. Application Details */}
              <section className="jobposting-section">
                <h3>4. Application Details</h3>
                <div className="jobposting-grid-2">
                  <div>
                    <label className="jobposting-small-label">Application Deadline</label>
                    <input type="date" name="deadline" value={form.deadline} onChange={onChange} className={`jobposting-input ${errors.deadline ? 'invalid' : ''}`} />
                    {errors.deadline && <div className="jobposting-error">{errors.deadline}</div>}
                  </div>
                  <div>
                    <label className="jobposting-small-label">Number of Openings</label>
                    <input type="number" min={1} name="numberOpenings" value={form.numberOpenings} onChange={onChange} className={`jobposting-input ${errors.numberOpenings ? 'invalid' : ''}`} />
                    {errors.numberOpenings && <div className="jobposting-error">{errors.numberOpenings}</div>}
                  </div>

                  {/* <div>
                    <label className="jobposting-small-label">Application Method</label>
                    <select name="applicationMethod" value={form.applicationMethod} onChange={onChange} className="jobposting-input">
                      <option value="internal">Internal Button</option>
                      <option value="external">External Link</option>
                      <option value="email">Email</option>
                    </select>
                  </div> */}

                  <div>
                    {(form.applicationMethod === 'external' || form.applicationMethod === 'email') && (
                      <>
                        <label className="jobposting-small-label">Application Target</label>
                        <input name="applicationTarget" placeholder={form.applicationMethod === 'external' ? 'e.g. https://acme.jobs/apply' : 'e.g. jobs@acme.com'} value={form.applicationTarget} onChange={onChange} className={`jobposting-input ${errors.applicationTarget ? 'invalid' : ''}`} />
                        {errors.applicationTarget && <div className="jobposting-error">{errors.applicationTarget}</div>}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* 5. Additional Metadata */}
              <section className="jobposting-section">
                <h3>5. Additional Metadata</h3>
                <div className="jobposting-grid-2">
                  <div>
                    <label className="jobposting-small-label">Posted Date</label>
                    <input type="date" name="postedDate" value={form.postedDate} onChange={onChange} className="jobposting-input" />
                  </div>
                  <div>
                    <label className="jobposting-small-label">Expiration Date</label>
                    <input type="date" name="expirationDate" value={form.expirationDate} onChange={onChange} className="jobposting-input" />
                  </div>
                </div>
              </section>

              <div className="jobposting-footer">
                <button type="submit" className="jobposting-btn">{selectedJobId ? 'Save' : 'Post Job'}</button>
              </div>
            </form>
          ) : (
            // job details view
            (() => {
              const job = postedJobs.find(j => (j._id||j.id) === selectedJobId) || {};
              return (
                <div className="job-detail">
                  <div className="job-detail-main">
                    <div className="job-detail-top">
                      <div className="job-detail-left">
                        <h2>{job.title}</h2>
                        <div className="company-location">{job.company} • {job.location || job.city || ''}</div>

                        <div className="job-meta-grid">
                          {job.type && <div className="job-meta-item">{job.type}</div>}
                          {job.category && <div className="job-meta-item">{job.category}</div>}
                          {job.status && <div className="job-meta-item">{job.status}</div>}
                          {(job.minSalary != null || job.maxSalary != null) && (
                            <div className="job-meta-item job-salary">{job.currency ? (job.currency + ' ') : ''}{job.minSalary || ''}{job.minSalary && job.maxSalary ? ' - ' + job.maxSalary : ''}{job.salaryFrequency ? ` / ${job.salaryFrequency}` : ''}</div>
                          )}
                          {job.numberOpenings && <div className="job-meta-item">Openings: {job.numberOpenings}</div>}
                          {job.workArrangement && <div className="job-meta-item">{job.workArrangement}</div>}
                        </div>
                      </div>
                      <div className="job-detail-logo">
                        {job.logoUrl || job.logo ? (
                          <img src={job.logoUrl || job.logo} alt={`${job.company || 'Company'} logo`} />
                        ) : (
                          <div className="logo-placeholder logo-placeholder-lg">No logo</div>
                        )}
                      </div>
                    </div>


                    <div className="job-detail-section">
                      <h4>Job Description</h4>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{job.description}</div>
                    </div>

                    {job.responsibilities && (
                      <div className="job-detail-section">
                        <h4>Responsibilities</h4>
                        {Array.isArray(job.responsibilities) ? (
                          <ul className="job-detail-list">{job.responsibilities.map((r,i) => <li key={i}>{r}</li>)}</ul>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{job.responsibilities}</div>
                        )}
                      </div>
                    )}

                    {job.requirements && (
                      <div className="job-detail-section">
                        <h4>Requirements</h4>
                        {Array.isArray(job.requirements) ? (
                          <ul className="job-detail-list">{job.requirements.map((r,i) => <li key={i}>{r}</li>)}</ul>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{job.requirements}</div>
                        )}
                      </div>
                    )}

                    {job.preferred && (
                      <div className="job-detail-section">
                        <h4>Preferred</h4>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{job.preferred}</div>
                      </div>
                    )}

                    {job.skills && (
                      <div className="job-detail-section">
                        <h4>Skills</h4>
                        <div>{Array.isArray(job.skills) ? job.skills.join(', ') : job.skills}</div>
                      </div>
                    )}

                    {job.benefits && (
                      <div className="job-detail-section">
                        <h4>Benefits</h4>
                        {Array.isArray(job.benefits) ? (
                          <ul className="job-detail-list">{job.benefits.map((b,i) => <li key={i}>{b}</li>)}</ul>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{job.benefits}</div>
                        )}
                      </div>
                    )}

                    <div className="job-detail-section">
                      <h4>Application</h4>
                      <div className="job-application">
                        <div><span className="job-detail-key">Method:</span>{formatMethod(job.applicationMethod || 'internal')}</div>
                        {job.applicationTarget && <div><span className="job-detail-key">Target:</span><a href={job.applicationTarget} target="_blank" rel="noreferrer">{job.applicationTarget}</a></div>}
                        <div style={{ marginTop: 8 }}>
                          <small className="job-meta-item">Posted: {formatDateString(job.postedAt || job.postedDate || job.createdAt)}</small>
                          {job.expirationDate && <small className="job-meta-item">Expires: {formatDateString(job.expirationDate)}</small>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
      {jobToDelete && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={() => { if (!isDeleting) setJobToDelete(null); }}>
          <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete job</h3>
            </div>
            <p>Are you sure you want to delete this job? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="wc-btn secondary" onClick={() => setJobToDelete(null)} disabled={isDeleting}>Cancel</button>
              <button type="button" className="wc-btn danger" onClick={() => performDelete(jobToDelete)} disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* *** 2. UPDATE MODAL JSX *** */}
      {repostModalOpen && (
        <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setRepostModalOpen(false)}>
          <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Re-post Job</h3>
              <button className="wc-modal-close" onClick={() => setRepostModalOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="wc-modal-body">
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                  New Expiration Date (optional)
                </label>
                <input
                  className="wc-input"
                  value={repostExpirationInput}
                  onChange={e => setRepostExpirationInput(e.target.value)}
                  placeholder="e.g. 2025-12-31 or 30 (for 30 days)"
                />
                <small style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>When the job post will be removed. YYYY-MM-DD or number of days.</small>
              </div>

              {/* --- NEW DEADLINE FIELD --- */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                  New Application Deadline (optional)
                </label>
                <input
                  type="date"
                  className="wc-input"
                  value={repostDeadlineInput}
                  onChange={e => setRepostDeadlineInput(e.target.value)}
                />
                <small style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>The last day for candidates to apply.</small>
              </div>
              {/* --- END NEW FIELD --- */}


              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Number of openings</label>
                <input
                  type="number"
                  min={1}
                  className="wc-input"
                  value={repostOpenings}
                  onChange={e => setRepostOpenings(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setRepostModalOpen(false)}>Cancel</button>
              <button className="wc-btn" onClick={confirmRepost}>Re-post</button>
            </div>
          </div>
        </div>
      )}

      
  </div>
  );
}

// styles moved to JobPosting.css