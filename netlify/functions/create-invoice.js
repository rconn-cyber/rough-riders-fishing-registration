// netlify/functions/create-invoice.js
// Creates Stripe Invoice + saves record to Netlify Blobs

const Stripe = require('stripe');

const DIVISION_PRICES = { inshore: 100, tarpon: 150 };
const ADDON_PRICES = { dinner: 45, tshirt: 25, bait: 40, cooler: 20, raffle: 20, photo: 60 };
const ADDON_NAMES  = { dinner: 'Awards Dinner Ticket', tshirt: 'Tournament T-Shirt', bait: 'Bait Package', cooler: 'Cooler Rental', raffle: 'Raffle Book (5 tickets)', photo: 'Pro Photo Package' };
const ADDON_FLAT   = { bait: true, cooler: true, raffle: true, photo: true };
const SPONSOR_PRICES = { title: 7500, gold: 5000, silver: 2500, bronze: 1000, anchor: 500 };
const SPONSOR_NAMES  = { title: 'Admiral Sponsorship', gold: 'Commodore Sponsorship', silver: 'Captain Sponsorship', bronze: 'Mate Sponsorship', anchor: 'Crew Sponsorship' };

async function saveToBlob(store, key, record) {
  const siteId = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  const url = `https://api.netlify.com/api/v1/blobs/${siteId}/${store}/${key}`;
  const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const existing = getRes.ok ? await getRes.json() : { value: [] };
  const arr = (existing && existing.value) ? existing.value : [];
  arr.push(record);
  await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: arr })
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const { type, data } = JSON.parse(event.body || '{}');

  try {
    // Create customer
    const customer = await stripe.customers.create({
      name: type === 'sponsor' ? `${data.firstName} ${data.lastName}` : `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone || undefined,
      metadata: { company: data.company || data.teamName || '', source: 'fishing-tournament-2026' }
    });

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 14,
      footer: 'To pay by credit card, use the Pay Now link above. To pay by check, make payable to "1st U.S. Volunteer Cavalry Regiment – Rough Riders, Inc." and mail to 601 N. 19th St., Tampa, FL 33605. Questions: fishing@tamparoughriders.org',
      metadata: { source: 'fishing-tournament-2026', type }
    });

    // Add line items
    if (type === 'registration') {
      const divPrice = DIVISION_PRICES[data.division] || 100;
      await stripe.invoiceItems.create({
        customer: customer.id, invoice: invoice.id,
        amount: divPrice * 100 * data.anglers,
        currency: 'usd',
        description: `${data.anglers} Angler${data.anglers > 1 ? 's' : ''} — ${data.division === 'inshore' ? 'Inshore' : 'Tarpon'} Division`
      });
      for (const addonId of (data.addons || [])) {
        const price = ADDON_PRICES[addonId];
        const name  = ADDON_NAMES[addonId];
        const qty   = ADDON_FLAT[addonId] ? 1 : data.anglers;
        if (price) {
          await stripe.invoiceItems.create({
            customer: customer.id, invoice: invoice.id,
            amount: price * 100 * qty, currency: 'usd', description: name
          });
        }
      }
    } else if (type === 'sponsor') {
      const price = SPONSOR_PRICES[data.tierId] || 0;
      const name  = SPONSOR_NAMES[data.tierId] || 'Sponsorship';
      await stripe.invoiceItems.create({
        customer: customer.id, invoice: invoice.id,
        amount: price * 100, currency: 'usd',
        description: `${name} — ${data.company}`
      });
    }

    // Finalize + send
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalized.id);

    // Save record to Blobs
    const record = {
      id: finalized.id,
      invoiceId: finalized.id,
      stripeCustomerId: customer.id,
      status: 'invoice',
      createdAt: new Date().toISOString(),
      ...data
    };

    const blobKey = type === 'sponsor' ? 'sponsors' : 'entries';
    await saveToBlob('fishing-admin', blobKey, record);

    // Fire email notification (fire and forget)
    fetch(`${process.env.URL}/.netlify/functions/send-registration-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data: record, invoiceId: finalized.id })
    }).catch(() => {});

    return { statusCode: 200, body: JSON.stringify({ success: true, invoiceId: finalized.id }) };
  } catch (err) {
    console.error('Invoice error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
