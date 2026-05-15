// netlify/functions/admin-data.js
// Netlify Blobs CRUD — store=fishing-admin, public GET for sponsors only

const crypto = require('crypto');

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return false;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return data.exp > Date.now();
}

async function blobRequest(method, store, key, body) {
  const siteId = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_TOKEN;
  const url = `https://api.netlify.com/api/v1/blobs/${siteId}/${store}/${key}`;
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (method === 'DELETE') return { ok: res.ok };
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Blob API ${res.status}`);
  }
  return res.json();
}

exports.handler = async (event) => {
  const { store, key } = event.queryStringParameters || {};
  const method = event.httpMethod;
  const isPublicRead = method === 'GET' && key === 'sponsors';

  if (!isPublicRead && !verifyToken(event.headers['authorization'])) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (!store || !key) return { statusCode: 400, body: 'Missing store or key' };

  try {
    if (method === 'GET') {
      const data = await blobRequest('GET', store, key);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || { value: [] }) };
    }

    if (method === 'POST') {
      const existing = await blobRequest('GET', store, key);
      const arr = (existing && existing.value) ? existing.value : [];
      const body = JSON.parse(event.body || '{}');
      const record = Object.assign({}, body, { id: body.id || ('R' + Date.now()), createdAt: new Date().toISOString() });
      arr.push(record);
      await blobRequest('PUT', store, key, { value: arr });
      return { statusCode: 200, body: JSON.stringify({ success: true, record }) };
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      await blobRequest('PUT', store, key, body);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (method === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      const existing = await blobRequest('GET', store, key);
      const arr = (existing && existing.value) ? existing.value : [];
      const filtered = arr.filter(r => r.id !== id);
      await blobRequest('PUT', store, key, { value: filtered });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-data error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
