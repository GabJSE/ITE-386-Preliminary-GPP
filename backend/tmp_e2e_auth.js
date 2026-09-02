const http = require('http');
const https = require('https');
const hostname = '127.0.0.1';
const port = 5000;

function req(path, method='GET', body=null, headers={}) {
  return new Promise((resolve, reject) => {
    const opts = { host: hostname, port, path, method, headers };
    const r = http.request(opts, res => {
      let b=''; res.on('data', d=>b+=d); res.on('end', ()=>{
        const ok = res.statusCode >=200 && res.statusCode < 300;
        try { const json = JSON.parse(b||'null'); resolve({ ok, status: res.statusCode, body: json, raw: b }); }
        catch(e) { resolve({ ok, status: res.statusCode, body: b, raw: b }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async ()=>{
  try {
    console.log('--- SIGNUP ---');
    const signupPayload = { email: 'e2e_user@example.com', password: 'TestPass123!', firstName: 'E2E', lastName: 'User' };
    const s = await req('/api/auth/signup','POST', signupPayload, {'Content-Type':'application/json'});
    console.log('signup:', s.status, s.body || s.raw);

    console.log('\n--- LOGIN ---');
    const l = await req('/api/auth/login','POST', { email: signupPayload.email, password: signupPayload.password }, {'Content-Type':'application/json'});
    console.log('login:', l.status, l.body || l.raw);
    if (!l.body || !l.body.token) { console.error('Login failed, aborting'); process.exit(1); }
    const token = l.body.token;

    console.log('\n--- GET PROFILE (with token) ---');
    const p = await req(`/api/profile?userId=${l.body.userId}`, 'GET', null, { Authorization: 'Bearer ' + token, Accept: 'application/json' });
    console.log('profile by userId:', p.status, p.body || p.raw);

    console.log('\n--- GET PROFILE (by email, no token) ---');
    const p2 = await req(`/api/profile?email=${encodeURIComponent(signupPayload.email)}`, 'GET', null, { Accept: 'application/json' });
    console.log('profile by email:', p2.status, p2.body || p2.raw);

    process.exit(0);
  } catch (err) { console.error('ERR', err); process.exit(2); }
})();
