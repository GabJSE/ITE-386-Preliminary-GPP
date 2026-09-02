export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/uploads`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json(); // { url }
}
