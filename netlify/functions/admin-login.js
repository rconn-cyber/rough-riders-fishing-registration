// netlify/functions/admin-login.js
// HMAC-SHA256 JWT login — same pattern as golf site

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { password } = JSON.parse(event.body || '{}');
  if (password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password' }) };
  }

  const secret = process.env.SESSION_SECRET;
  const payload = Buffer.from(JSON.stringify({ iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const token = `${payload}.${sig}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  };
};
