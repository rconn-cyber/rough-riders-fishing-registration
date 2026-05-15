// netlify/functions/create-checkout.js
// Stripe Checkout Session for angler registrations + sponsorships

const Stripe = require('stripe');

const DIVISION_PRICES = { inshore: 10000, tarpon: 15000 }; // cents

const ADDON_PRICES = {
  dinner: 4500,
  tshirt: 2500,
  bait:   4000,
  cooler: 2000,
  raffle: 2000,
  photo:  6000
};

const ADDON_NAMES = {
  dinner: 'Awards Dinner Ticket',
  tshirt: 'Tournament T-Shirt',
  bait:   'Bait Package',
  cooler: 'Cooler Rental',
  raffle: 'Raffle Book (5 tickets)',
  photo:  'Pro Photo Package'
};

const ADDON_FLAT = { bait: true, cooler: true, raffle: true, photo: true };

const SPONSOR_PRICES = { title: 750000, gold: 500000, silver: 250000, bronze: 100000, anchor: 50000 };
const SPONSOR_NAMES  = { title: 'Admiral Sponsorship', gold: 'Commodore Sponsorship', silver: 'Captain Sponsorship', bronze: 'Mate Sponsorship', anchor: 'Crew Sponsorship' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const body = JSON.parse(event.body || '{}');
  const lineItems = [];

  // ── Registration ──
  if (body.type !== 'sponsor' && body.anglers) {
    const divisionPrice = DIVISION_PRICES[body.division] || DIVISION_PRICES.inshore;
    const contact = body.contactInfo || {};
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${body.anglers} Angler${body.anglers > 1 ? 's' : ''} — ${body.division === 'inshore' ? 'Inshore' : 'Tarpon'} Division`,
          description: `31st Annual Rough Riders Charity Fishing Tournament · ${contact.teamName || contact.firstName + ' ' + contact.lastName || ''}`
        },
        unit_amount: divisionPrice
      },
      quantity: body.anglers
    });

    (body.addons || []).forEach(addonId => {
      const price = ADDON_PRICES[addonId];
      const name = ADDON_NAMES[addonId];
      const flat = ADDON_FLAT[addonId];
      if (price && name) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name },
            unit_amount: price
          },
          quantity: flat ? 1 : body.anglers
        });
      }
    });
  }

  // ── Sponsorship ──
  if (body.type === 'sponsor' && body.data) {
    const sp = body.data;
    const price = SPONSOR_PRICES[sp.tierId];
    const name = SPONSOR_NAMES[sp.tierId];
    if (price && name) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name,
            description: `${sp.company} — Rough Riders Fishing Tournament 2026`
          },
          unit_amount: price
        },
        quantity: 1
      });
    }
  }

  if (!lineItems.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No line items' }) };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: (process.env.SUCCESS_URL || 'https://roughridersfishing.org/success.html') + '?confirmed=1',
      cancel_url: process.env.CANCEL_URL || 'https://roughridersfishing.org/register.html',
      customer_email: body.contactInfo?.email || body.data?.email,
      metadata: {
        source: 'fishing-tournament-2026',
        type: body.type || 'registration',
        division: body.division || '',
        anglers: String(body.anglers || 0)
      }
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
