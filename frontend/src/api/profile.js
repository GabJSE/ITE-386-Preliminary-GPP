export async function saveProfile(payload) {
  const token = payload.__token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // remove internal-only token before sending body
  const bodyPayload = { ...payload };
  delete bodyPayload.__token;

  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

export async function getOwnProfile(token, userId, email) {
  const base = `${process.env.REACT_APP_API_URL || ''}/api/profile`;
  // prefer explicit email query when provided (works around token payload differences)
  let url = base;
  if (email) url = `${base}?email=${encodeURIComponent(email)}`;
  else if (userId) url = `${base}?userId=${encodeURIComponent(userId)}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}
