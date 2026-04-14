# Playbuuk — Trading Psychology & Strategy Discipline Platform

> Trade the plan, not the emotion.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Database

```bash
npx prisma generate          # generate client
npx prisma db push           # push schema to Supabase
npx prisma db seed           # seed 3 verified + 8 draft mentors + requests
```

## Pre-launch Checklist

### Environment Variables (set in Vercel dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                  # pooled (pgBouncer)
DIRECT_URL=                    # direct (for migrations)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
METAAPI_TOKEN=
METAAPI_DOMAIN=agiliumtrade.agiliumtrade.ai
NEXT_PUBLIC_APP_URL=https://playbuuk.com
NEXT_PUBLIC_APP_NAME=Playbuuk
VAPID_PUBLIC_KEY=              # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@playbuuk.com
```

### Stripe Setup
- [ ] Create Pro product ($19.99/mo) and save Price ID to env: `STRIPE_PRO_PRICE_ID`
- [ ] Create Mentor Direct product ($9.99/mo) and save Price ID: `STRIPE_MENTOR_DIRECT_PRICE_ID`
- [ ] Configure Stripe Connect (Express accounts)
- [ ] Register webhook endpoints:
  - `https://playbuuk.com/api/stripe/webhook` — subscription events
  - `https://playbuuk.com/api/stripe/connect` — Connect payout events

### Supabase Setup
- [ ] Enable Email Auth
- [ ] Enable Google OAuth (optional MVP)
- [ ] Set Site URL to `https://playbuuk.com`
- [ ] Set Redirect URLs: `https://playbuuk.com/auth/callback`
- [ ] Enable Row Level Security on all tables
- [ ] Run migrations: `npx prisma db push`
- [ ] Run seed: `npx prisma db seed`

### Vercel Setup
- [ ] Connect GitHub repo
- [ ] Set all environment variables
- [ ] Set `NEXT_PUBLIC_APP_URL=https://playbuuk.com`
- [ ] Configure custom domain
- [ ] Enable Edge Network (auto)
- [ ] Deploy: `git push` triggers auto-deploy

### Post-Deploy Checks
- [ ] `/home` loads the public landing page
- [ ] `/login` and `/signup` load auth forms
- [ ] `/marketplace` requires auth (redirects to `/login`)
- [ ] Stripe webhook receives test events
- [ ] PWA installs on mobile Chrome (Add to Home Screen)
- [ ] Push notification test fires from alert settings
- [ ] Run: `npx prisma db seed` against production DB

### User Flow Test
1. Sign up → profile created
2. Follow a mentor → follow count increments
3. View playbook (Pro gate if free tier)
4. Connect demo MT5 account via MetaApi
5. Verify checklist auto-detects on live market data
6. Grade updates in real-time
7. Execute a B+ setup → trade logged in journal
8. Check psychology insights (5+ trades required)
9. Set up alert preferences → trigger test notification
10. Test grade threshold block on D+ setup
11. Test override flow → verify `grade_override=true` in journal

## Architecture

```
app/
  page.tsx                    ← Smart router (auth → /marketplace, non-auth → /home)
  (marketing)/home/           ← Public landing page (SEO/GEO optimised)
  (marketing)/terms/          ← Terms of Service
  (marketing)/privacy/        ← Privacy Policy
  (marketing)/disclaimer/     ← Risk Disclosure
  (auth)/login/               ← Login form
  (auth)/signup/              ← Signup form
  (platform)/marketplace/     ← Mentor marketplace (auth required)
  (platform)/mentor/[id]/     ← Playbook viewer (discipline engine)
  (platform)/scanner/         ← Live multi-mentor scanner (Pro only)
  (platform)/journal/         ← Trade journal + psychology insights
  (platform)/accounts/        ← Connected trading accounts
  (platform)/requests/        ← Request a mentor
  portal/                     ← Mentor portal
  admin/                      ← Admin dashboard
```

## Seed Data (after `npx prisma db seed`)

**Verified mentors (3):** Alex G (ICT/SMC), Tori Trades (Price Action), Marcus Webb (EMA Trend)

**Draft mentors (8):** Mack Gray (Trend Following), TradeWithPat (S&D), FX Carlos (Fibonacci),
Chris Forex (MTF Swing), The Trading Geek (London Scalping), Navin Prithyani (Naked PA),
Sam Seiden (Institutional S&D), Rayner Teo (Systematic Trend)

**Mentor Requests (4):** Adam Grimes (47 votes), The Trading Channel (31), Anton Kreil (22), NNFX (18)
