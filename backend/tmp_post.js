const http = require('http');
const data = JSON.stringify({ email: 'dev@example.com', firstName: 'Dev', lastName: 'Tester' });

const opts = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/profile',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(opts, res => {
  console.log('STATUS', res.statusCode);
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('BODY', b));
});
req.on('error', e => console.error('ERR', e));
req.write(data);
req.end();
