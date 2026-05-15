# 31st Annual Rough Riders Charity Fishing Tournament
## Registration & Admin Site

Built on the same stack as the golf tournament site.

---

## File Structure

```
/
├── netlify.toml                         # Redirect / → /register.html
├── package.json                         # stripe dependency
├── public/
│   ├── register.html                    # Public registration + sponsor signup
│   ├── admin.html                       # Password-protected admin dashboard
│   └── success.html                     # Post-Stripe-payment confirmation
└── netlify/functions/
    ├── admin-login.js                   # HMAC JWT login
    ├── admin-data.js                    # Netlify Blobs CRUD
    ├── create-checkout.js               # Stripe Checkout Session
    ├── create-invoice.js                # Stripe Invoice + saves to Blobs
    └── send-registration-email.js       # Resend dual email
```

---

## Environment Variables (set in Netlify Dashboard → Site settings → Environment)

| Variable              | Value                                          |
|-----------------------|------------------------------------------------|
| `STRIPE_SECRET_KEY`   | `sk_live_...` or `sk_test_...`                |
| `ADMIN_PASSWORD`      | Admin dashboard password                       |
| `SESSION_SECRET`      | 40+ random chars for JWT signing               |
| `NETLIFY_SITE_ID`     | UUID from Site config → General                |
| `NETLIFY_TOKEN`       | Personal access token from User settings       |
| `SUCCESS_URL`         | `https://yoursite.netlify.app/success.html`    |
| `CANCEL_URL`          | `https://yoursite.netlify.app/register.html`   |
| `RESEND_API_KEY`      | From resend.com                                |
| `FROM_EMAIL`          | `fishing@tamparoughriders.org`                 |
| `ADMIN_EMAILS`        | Comma-separated admin emails for notifications |
| `URL`                 | Netlify auto-sets this to your site URL        |

After setting env vars → **Trigger deploy** in Netlify to pick them up.

---

## Netlify Blobs (auto-created, no setup needed)

All data is stored in the `fishing-admin` blob store:

| Key        | Contents                              |
|------------|---------------------------------------|
| `entries`  | Array of angler registration records  |
| `sponsors` | Array of sponsor records              |
| `comps`    | Array of complimentary slot records   |
| `settings` | Admin users + notification prefs      |

---

## Pricing

### Divisions
| Division | Price/Angler |
|----------|-------------|
| Inshore  | $100        |
| Tarpon   | $150        |

### Add-Ons
| Item                    | Price | Type       |
|-------------------------|-------|------------|
| Awards Dinner Ticket    | $45   | Per angler |
| Tournament T-Shirt      | $25   | Per angler |
| Bait Package            | $40   | Flat rate  |
| Cooler Rental           | $20   | Flat rate  |
| Raffle Book (5 tickets) | $20   | Flat rate  |
| Pro Photo Package       | $60   | Flat rate  |

### Sponsorship Tiers
| Tier      | Name       | Price  | Anglers | Dinners |
|-----------|------------|--------|---------|---------|
| Title     | Admiral    | $7,500 | 4       | 16      |
| Gold      | Commodore  | $5,000 | 2       | 8       |
| Silver    | Captain    | $2,500 | 2       | 4       |
| Bronze    | Mate       | $1,000 | 0       | 2       |
| Anchor    | Crew       | $500   | 0       | 0       |

---

## Deployment

1. Create GitHub repo (e.g., `rconn-cyber/rough-riders-fishing-reg`)
2. Drag-and-drop all files into GitHub
3. Connect repo to Netlify (Import project)
4. Set all environment variables above
5. Trigger deploy → site is live

For DNS: point `register.roughridersfishing.org` CNAME → your Netlify subdomain

---

## Admin Access

Navigate to `/admin.html` (or click the gear icon in the hero).
Password is set via `ADMIN_PASSWORD` env var.

Admin tabs:
- **Entries** — View/add/edit/delete registrations, search, export CSV
- **Sponsors** — Sponsor management with logos, tier badges, comp slot tracking
- **Complimentary** — Assign comp angler slots per sponsor tier
- **Settings** — Admin users, notification preferences, tier reference

---

*1st U.S. Volunteer Cavalry Regiment – Rough Riders, Inc. | 601 N. 19th St., Tampa, FL 33605*
