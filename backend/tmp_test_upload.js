const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function run() {
  const filePath = require('path').join(__dirname, 'test_upload.txt');
  fs.writeFileSync(filePath, 'hello');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const res = await fetch('http://localhost:5000/api/uploads', { method: 'POST', body: form });
  const j = await res.json();
  console.log('status', res.status, j);
}

run().catch(err => { console.error(err); process.exit(1); });
