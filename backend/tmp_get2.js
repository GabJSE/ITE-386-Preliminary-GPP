const http = require('http');
http.get('http://localhost:5000/api/profile?email=dev@example.com', res => {
  console.log('STATUS', res.statusCode);
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('BODY', b));
}).on('error', e => console.error('ERR', e));
