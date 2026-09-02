// Simple notifications API wrapper
const BASE = process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_URL || '';

async function getNotifications(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/notifications`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function markAllRead(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/notifications/read-all`, {
    method: 'PATCH',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


async function markRead(id, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteNotification(id, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function sendNotification(token, data) {
  const base = process.env.REACT_APP_API_URL || '';
  const res = await fetch(`${base}/api/notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Failed to send notification (${res.status})`);
  return res.json();
}

export { getNotifications, markRead, deleteNotification };
