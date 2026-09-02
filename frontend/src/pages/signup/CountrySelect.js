import React, { useState, useRef, useEffect } from 'react';
// If you install `flag-icon-css`, the CountrySelect will use its CSS classes
// for crisp flags (e.g. `flag-icon flag-icon-ph`). If not installed we fall
// back to emoji glyphs embedded in the country data.

// countries will be loaded on mount inside the component

function CountrySelect({ value, onChange, className, showCode = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef();

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const [countries, setCountries] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch('https://countrycode.dev/api/countries')
      .then(r => r.json())
      .then(data => {
        if (!mounted) return;
        setCountries(
          data.map(c => ({
            code: c.dial_code,
            name: c.name,
            flag: c.flag || c.emoji || '',
            iso: (c.code || '').toLowerCase(),
          }))
        );
      })
      .catch(() => {
        if (!mounted) return;
        setCountries([
          { code: '+63', name: 'Philippines', flag: '🇵🇭', iso: 'ph' },
          { code: '+1', name: 'United States', flag: '🇺🇸', iso: 'us' },
        ]);
      });

    return () => { mounted = false; };
  }, []);

  const list = countries.filter(c => (`${c.name} ${c.code}`).toLowerCase().includes(q.toLowerCase()));

  const current = countries.find(c => c.code === value) || countries[0] || { code: value || '', name: 'Select country', flag: '🏳️', iso: '' };

  return (
    <div ref={ref} className={className} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(s => !s)} className="country-btn">
        {current.iso ? <span className={`flag-icon flag-icon-${current.iso}`} style={{ marginRight: 8 }} /> : <span style={{ marginRight: 8 }}>{current.flag}</span>}
        {showCode && <span style={{ marginRight: 8 }}>{current.code}</span>}
        <span style={{ opacity: 0.6 }}>{current.name}</span>
      </button>

      {open && (
        <div className="country-dropdown">
          <input className="wc-search country-search" placeholder="Search country or code" value={q} onChange={e => setQ(e.target.value)} />
          <ul className="country-list">
            {list.map(c => (
              <li key={c.code} className="country-item" onClick={() => { onChange(c.code, c.name); setOpen(false); }}>
                {c.iso ? <span className={`flag-icon flag-icon-${c.iso}`} style={{ marginRight: 8 }} /> : <span style={{ marginRight: 8 }}>{c.flag}</span>}
                {showCode && <strong style={{ marginRight: 8 }}>{c.code}</strong>}
                <span style={{ color: '#333' }}>{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CountrySelect;
