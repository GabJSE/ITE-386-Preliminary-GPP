export async function signup(payload) {
  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errText = 'Failed to sign up';
    try { const data = await res.json(); if (data && data.error) errText = data.error; } catch (e) { /* ignore */ }
    throw new Error(errText);
  }
  return res.json();
}

export async function login(payload) {
  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || 'Failed to login');
  }
  return res.json();
}

export async function exists(email) {
  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/exists?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    let txt = 'Failed to check email';
    try { const d = await res.json(); if (d && d.error) txt = d.error; } catch (e) {}
    throw new Error(txt);
  }
  return res.json();
}