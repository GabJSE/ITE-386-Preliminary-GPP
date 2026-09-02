export async function sendCode(contact, method = 'email') {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/verify/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact, method }),
  });
  if (!res.ok) {
    let errText = 'Failed to send code';
    try { const data = await res.json(); if (data && data.error) errText = data.error; } catch (e) { /* ignore */ }
    throw new Error(errText);
  }
  return res.json();
}

export async function verifyCode(contact, code) {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/verify/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact, code }),
  });
  if (!res.ok) {
    let errText = 'Failed to verify code';
    try { const data = await res.json(); if (data && data.error) errText = data.error; } catch (e) { /* ignore */ }
    throw new Error(errText);
  }
  return res.json();
}
