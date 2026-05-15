// netlify/functions/send-registration-email.js
// Sends dual confirmation email: registrant + admin notification

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { type, data, invoiceId } = JSON.parse(event.body || '{}');
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM       = process.env.FROM_EMAIL || 'fishing@tamparoughriders.org';
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

  const sendEmail = async (to, subject, html) => {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html })
    });
  };

  const navy = '#0d1f3c';
  const gold = '#c9a84c';

  try {
    // ── Registrant confirmation ──
    if (type === 'registration' && data.email) {
      const subject = `You're registered! Rough Riders Fishing Tournament 2026`;
      const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fff;">
  <div style="background:${navy};padding:32px 40px;text-align:center;">
    <div style="color:${gold};font-size:13px;letter-spacing:0.2em;font-family:Arial,sans-serif;margin-bottom:8px;">31ST ANNUAL</div>
    <div style="color:#fff;font-size:26px;font-weight:bold;">Rough Riders Charity Fishing Tournament</div>
    <div style="color:rgba(255,255,255,0.7);font-size:15px;font-style:italic;margin-top:6px;">June 19–20, 2026 · Treasure Island, FL</div>
  </div>
  <div style="padding:36px 40px;">
    <p style="font-size:20px;color:${navy};font-weight:bold;">Bully! You're registered, ${data.firstName}!</p>
    <p style="color:#445577;font-size:16px;margin:12px 0 24px;">Your registration for the <strong>${data.division === 'inshore' ? 'Inshore' : 'Tarpon'} Division</strong> is confirmed. Here are your details:</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Name</td><td style="font-weight:600;color:${navy};">${data.firstName} ${data.lastName}</td></tr>
      <tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Division</td><td style="font-weight:600;color:${navy};">${data.division === 'inshore' ? 'Inshore' : 'Tarpon'}</td></tr>
      <tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Anglers</td><td style="font-weight:600;color:${navy};">${data.anglers}</td></tr>
      ${data.teamName ? `<tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Team / Boat</td><td style="font-weight:600;color:${navy};">${data.teamName}</td></tr>` : ''}
      <tr><td style="padding:10px 0;color:#445577;">Confirmation #</td><td style="font-weight:600;color:${navy};">${invoiceId || data.id || '—'}</td></tr>
    </table>
    ${invoiceId ? `<p style="margin-top:24px;padding:16px;background:#fff8e0;border-left:4px solid ${gold};font-size:15px;color:#445577;">An invoice has been sent to your email. Please remit payment within 14 days to secure your entry.</p>` : ''}
    <p style="margin-top:28px;font-size:15px;color:#445577;">Questions? Contact us at <a href="mailto:fishing@tamparoughriders.org" style="color:${navy};">fishing@tamparoughriders.org</a></p>
    <p style="margin-top:8px;font-size:16px;font-style:italic;color:${navy};">Bully! — 1st U.S. Volunteer Cavalry Regiment – Rough Riders, Inc.</p>
  </div>
  <div style="background:#f5f0e8;padding:16px 40px;text-align:center;font-size:12px;color:#888;">601 N. 19th St., Tampa, FL 33605 | 501(c)(3) Charitable Organization</div>
</div>`;
      await sendEmail(data.email, subject, html);
    }

    // ── Sponsor confirmation ──
    if (type === 'sponsor' && data.email) {
      const subject = `Sponsorship confirmed — Rough Riders Fishing Tournament 2026`;
      const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fff;">
  <div style="background:${navy};padding:32px 40px;text-align:center;">
    <div style="color:${gold};font-size:22px;font-weight:bold;">Thank You for Your Sponsorship!</div>
    <div style="color:rgba(255,255,255,0.8);font-size:15px;margin-top:8px;">Rough Riders Fishing Tournament 2026</div>
  </div>
  <div style="padding:36px 40px;">
    <p style="font-size:18px;color:${navy};font-weight:bold;">Dear ${data.firstName},</p>
    <p style="color:#445577;font-size:16px;margin:12px 0;">Thank you for your generous support of the 31st Annual Rough Riders Charity Fishing Tournament as a <strong>${data.tierName || data.tierId} Sponsor</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Company</td><td style="font-weight:600;color:${navy};">${data.company}</td></tr>
      <tr style="border-bottom:1px solid #f0f2f8;"><td style="padding:10px 0;color:#445577;">Tier</td><td style="font-weight:600;color:${navy};">${data.tierName || data.tierId}</td></tr>
      <tr><td style="padding:10px 0;color:#445577;">Amount</td><td style="font-weight:600;color:${navy};">$${(data.amount||0).toLocaleString()}</td></tr>
    </table>
    ${invoiceId ? `<p style="margin-top:24px;padding:16px;background:#fff8e0;border-left:4px solid ${gold};font-size:15px;color:#445577;">An invoice has been sent to your email. Please remit payment within 14 days.</p>` : ''}
    <p style="margin-top:24px;font-size:15px;color:#445577;">Our team will be in touch about your sponsorship benefits and logo placement. Contact: <a href="mailto:fishing@tamparoughriders.org" style="color:${navy};">fishing@tamparoughriders.org</a></p>
    <p style="margin-top:8px;font-size:16px;font-style:italic;color:${navy};">Bully! — 1st U.S. Volunteer Cavalry Regiment – Rough Riders, Inc.</p>
  </div>
  <div style="background:#f5f0e8;padding:16px 40px;text-align:center;font-size:12px;color:#888;">601 N. 19th St., Tampa, FL 33605 | 501(c)(3) Charitable Organization</div>
</div>`;
      await sendEmail(data.email, subject, html);
    }

    // ── Admin notification ──
    if (ADMIN_EMAILS.length > 0) {
      const adminSubject = type === 'sponsor'
        ? `New sponsor: ${data.company} (${data.tierName}) — Fishing Tournament`
        : `New registration: ${data.firstName} ${data.lastName} (${data.division}) — Fishing Tournament`;
      const adminHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
        <strong>${adminSubject}</strong><br><br>
        ${Object.entries(data).filter(([k]) => !['logo','addons'].includes(k)).map(([k,v]) => `<strong>${k}:</strong> ${v}`).join('<br>')}
      </div>`;
      await sendEmail(ADMIN_EMAILS, adminSubject, adminHtml);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
