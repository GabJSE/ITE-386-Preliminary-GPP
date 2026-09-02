const http = require('http');
const opts = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/status',
  method: 'GET',
  headers: { 'Accept': 'application/json' }
};
http.get(opts, res => {
  console.log('STATUS', res.statusCode);
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => {
    try {
      console.log('BODY', JSON.parse(b));
    } catch (e) {
      console.log('BODY (raw)', b);
    }
  });
}).on('error', e => console.error('ERR', e));
