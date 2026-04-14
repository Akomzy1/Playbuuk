# Playbuuk — Trading Psychology & Strategy Discipline Platform

## Project Overview
Playbuuk is a SaaS platform that solves the #1 reason retail traders fail: emotional and impulsive trading. It transforms trading mentor strategies into live, interactive playbooks that enforce discipline through auto-detecting checklists, real-time setup grading, and psychology-gated trade execution. Every feature is designed to keep traders accountable to their strategy — not their emotions.

Mentors partner with the platform, review AI-drafted playbooks of their strategy, and earn recurring revenue from their followers' usage. Traders follow mentors, access structured playbooks with auto-detecting checklists, real-time setup grading, and one-click trade execution synced to MT5 — but only when the system confirms the setup meets the mentor's criteria.

**Core thesis:** Traders don't fail because they lack knowledge — they fail because they can't follow their own rules. Playbuuk eliminates the gap between "knowing" and "doing."

**Product type:** Two-sided marketplace (Mentors + Traders)
**Business model:** Freemium SaaS with mentor revenue share
**Stage:** MVP build
**Owner:** Tokunbo / AkomzyAi Consulting

---

## The Problem: Trading Psychology

### Why Traders Fail
- 80%+ of retail traders lose money — not from bad strategies, but from bad execution of good strategies
- FOMO (Fear of Missing Out): entering trades that don't meet criteria
- Revenge trading: chasing losses with impulsive entries
- Overtrading: taking C-grade setups because "it looks close enough"
- Plan abandonment: deviating from stop loss, take profit, or risk rules mid-trade
- Confirmation bias: seeing what you want to see instead of what the chart shows

### How Playbuuk Solves It
Every feature maps directly to a psychological weakness:

| Psychological Problem | Playbuuk Solution |
|----------------------|-------------------|
| FOMO / Impulsive entries | Auto-checklist objectively evaluates setup — no room for "it looks good enough" |
| Revenge trading | Minimum grade threshold (C+) blocks trade execution after bad setups |
| Overtrading | Setup grade clearly shows D+ setups — removes ambiguity |
| Plan abandonment | Trade panel pre-fills SL/TP from playbook rules — changing them requires explicit override |
| Confirmation bias | Auto-detection removes subjective interpretation — BOS either happened or it didn't |
| No accountability | Trade journal auto-tags every trade with mentor, grade, and playbook — patterns visible |
| Chart staring | Setup alerts notify when A+/B+ conditions are met — walk away until then |
| Emotional decision-making | The system makes the assessment, not the trader. Follow the grade, not the feeling. |

### Positioning Statement
"Playbuuk doesn't teach you how to trade. It stops you from trading badly."

---

## Core Terminology

- **Follow** — Free action. Any trader can follow any mentor. Like Instagram — zero friction.
- **Follower** — A trader who follows a mentor. Mentors promote: "Follow me on Playbuuk."
- **Pro Follower** — A follower on the Pro subscription tier. Their usage generates mentor revenue.
- **Mentor Direct Follower** — A follower who pays the $9.99/month premium for a specific mentor.
- **Verified Mentor** — Mentor who has reviewed and approved their playbook. Gets the badge.
- **Draft Mentor** — Mentor added by admin or requested by users. AI-extracted playbook, not yet verified.
- **Setup Grade** — A+ to D+ objective score that tells the trader: take this trade, or walk away.
- **Discipline Score** — (Future) Rolling metric tracking how consistently a trader follows their grade thresholds.

---

## Tech Stack

### Core
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** TailwindCSS
- **Database:** Supabase (PostgreSQL + Auth + Realtime + RLS)
- **ORM:** Prisma (connected to Supabase PostgreSQL)
- **AI:** Claude API (Sonnet 4) with web search tool for strategy extraction
- **Payments:** Stripe Subscriptions + Stripe Connect Express (mentor payouts)
- **Trade Execution:** MetaApi cloud REST API (MT4/MT5 bridge)
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Market Data:** Simulated for MVP → Twelve Data API for production

### Key Libraries
- @supabase/ssr — server-side Supabase client for App Router
- stripe + @stripe/stripe-js — payments and checkout
- metaapi.cloud-sdk — MT4/MT5 trade execution bridge (via API routes)
- recharts — charting
- zustand — client state management
- zod — schema validation
- date-fns — date formatting
- lucide-react — icons

---

## Project Structure

```
playbuuk/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts
│   ├── (platform)/
│   │   ├── layout.tsx              # Main nav layout (role-aware)
│   │   ├── page.tsx                # Home / Mentor Marketplace
│   │   ├── mentor/[id]/page.tsx    # Playbook Viewer (chart + checklist + grade + trade)
│   │   ├── scanner/page.tsx        # Live Multi-Mentor Scanner
│   │   ├── journal/page.tsx        # Trade Journal + Psychology Insights
│   │   ├── accounts/page.tsx       # Connected Trading Accounts
│   │   └── requests/page.tsx       # Request a Mentor page
│   ├── portal/
│   │   ├── layout.tsx              # Mentor Portal layout
│   │   ├── page.tsx                # Mentor Dashboard (analytics + revenue + follower stats)
│   │   ├── playbook/page.tsx       # Playbook Editor
│   │   └── settings/page.tsx       # Mentor profile editor
│   ├── admin/
│   │   ├── page.tsx                # Admin dashboard
│   │   ├── pipeline/page.tsx       # Mentor partnership pipeline
│   │   ├── payouts/page.tsx        # Payout management (including escrow)
│   │   ├── add-mentor/page.tsx     # Add unverified mentor + generate AI draft
│   │   └── requests/page.tsx       # User mentor requests ranked by votes
│   ├── api/
│   │   ├── mentors/route.ts
│   │   ├── mentors/[id]/route.ts
│   │   ├── mentors/[id]/follow/route.ts    # Follow / unfollow
│   │   ├── playbooks/route.ts
│   │   ├── playbooks/[id]/route.ts
│   │   ├── playbooks/[id]/usage/route.ts
│   │   ├── playbooks/extract/route.ts
│   │   ├── journal/route.ts
│   │   ├── trade/
│   │   │   ├── connect/route.ts
│   │   │   ├── execute/route.ts
│   │   │   ├── positions/route.ts
│   │   │   ├── close/route.ts
│   │   │   └── accounts/route.ts
│   │   ├── requests/route.ts               # Submit + vote on mentor requests
│   │   ├── alerts/
│   │   │   ├── preferences/route.ts        # Get/update alert settings
│   │   │   ├── history/route.ts            # Past alerts + conversion data
│   │   │   └── test/route.ts               # Send test notification
│   │   ├── stripe/checkout/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   ├── stripe/connect/route.ts
│   │   ├── mentor/analytics/route.ts
│   │   └── admin/
│   │       ├── payouts/route.ts
│   │       ├── add-mentor/route.ts
│   │       └── requests/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── layout/
│   ├── marketplace/
│   │   ├── mentor-card.tsx
│   │   ├── mentor-grid.tsx
│   │   ├── pricing-tiers.tsx
│   │   ├── pipeline-status.tsx
│   │   ├── follow-button.tsx
│   │   └── request-mentor.tsx
│   ├── playbook/
│   │   ├── playbook-header.tsx
│   │   ├── candlestick-chart.tsx
│   │   ├── indicator-strip.tsx
│   │   ├── live-checklist.tsx          # Discipline enforcement UI
│   │   ├── setup-grade.tsx             # Psychology gate — shows go/no-go
│   │   ├── golden-rules.tsx
│   │   ├── entry-exit-rules.tsx
│   │   ├── pair-scanner.tsx
│   │   └── trade-panel.tsx             # Psychology-gated execution
│   ├── scanner/
│   ├── journal/
│   │   ├── journal-entry.tsx
│   │   ├── journal-form.tsx
│   │   ├── journal-stats.tsx
│   │   └── psychology-insights.tsx     # Pattern analysis: when do you deviate?
│   ├── trade/
│   │   ├── connect-account.tsx
│   │   ├── trade-ticket.tsx
│   │   ├── position-card.tsx
│   │   └── account-selector.tsx
│   ├── alerts/
│   │   ├── alert-preferences.tsx       # Configure threshold, mentors, pairs, sessions
│   │   ├── alert-history.tsx           # Past alerts with tap/trade conversion
│   │   └── alert-banner.tsx            # In-app alert banner on marketplace
│   └── portal/
│       ├── playbook-editor.tsx
│       ├── section-editor.tsx
│       ├── checklist-editor.tsx
│       ├── analytics-dashboard.tsx
│       ├── revenue-card.tsx
│       └── follower-stats.tsx
├── lib/
│   ├── supabase/
│   ├── stripe/
│   ├── metaapi/
│   │   ├── client.ts
│   │   ├── execute.ts
│   │   ├── accounts.ts
│   │   └── positions.ts
│   ├── market/
│   │   ├── engine.ts
│   │   ├── indicators.ts
│   │   ├── structure.ts
│   │   ├── trendlines.ts
│   │   ├── patterns.ts
│   │   └── session.ts
│   ├── playbook/
│   │   ├── evaluator.ts
│   │   ├── grader.ts
│   │   └── schema.ts
│   ├── ai/
│   │   ├── extract.ts
│   │   └── prompts.ts
│   ├── mentor/
│   │   ├── onboard.ts
│   │   ├── escrow.ts
│   │   └── follow.ts
│   ├── alerts/
│   │   ├── scanner.ts              # Background scanner — evaluates all pairs × followed mentors
│   │   ├── push.ts                 # Web Push API notification sender
│   │   └── dedup.ts                # Deduplication — no re-alert within 30 min for same combo
│   └── utils.ts
├── stores/
│   ├── market-store.ts
│   ├── checklist-store.ts
│   ├── user-store.ts
│   └── trade-store.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── manifest.json
│   └── sw.js
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

---

## Database Schema

### profiles
- id (uuid, PK, FK → auth.users)
- role: enum ('trader', 'mentor', 'admin') default 'trader'
- display_name, avatar_url
- tier: enum ('free', 'pro') default 'free'
- stripe_customer_id (nullable)
- created_at, updated_at

### mentors
- id (uuid, PK)
- user_id (FK → profiles, NULLABLE — null until mentor claims)
- display_name, handle, bio, avatar_emoji
- markets (jsonb array), style, signature
- follower_count (int, default 0)
- external_followers (text)
- rating (numeric), review_count (int)
- verified (boolean, default false), verified_at (nullable)
- stripe_connect_id (nullable)
- onboarding_status: enum ('admin_added', 'draft_ready', 'invitation_sent', 'under_review', 'verified', 'withdrawn')
- added_by (FK → profiles)
- contact_info (text, nullable)
- created_at, updated_at

### mentor_follows
- id (uuid, PK)
- user_id (FK → profiles)
- mentor_id (FK → mentors)
- followed_at (timestamp)
- UNIQUE constraint on (user_id, mentor_id)

### playbooks
- id (uuid, PK)
- mentor_id (FK → mentors)
- strategy_name, summary
- timeframes (jsonb), core_concepts (jsonb), entry_rules (jsonb), exit_rules (jsonb)
- risk_management (jsonb), indicators (jsonb)
- checklist (jsonb: [{id, item, category, weight, auto, evalKey}])
- golden_rules (jsonb), common_mistakes (jsonb)
- preferred_pairs (jsonb), session_preference
- is_verified (boolean), is_ai_draft (boolean)
- version (int), published_at, updated_at

### subscriptions
- id, user_id, tier, mentor_id (nullable), stripe_subscription_id, status, period_start, period_end

### playbook_usage
- id, user_id, playbook_id
- event_type: enum ('checklist_open', 'time_spent', 'trade_logged', 'trade_executed')
- duration_seconds (nullable), created_at

### trade_journal
- id, user_id, playbook_id, pair, direction (long/short)
- risk_r, setup_grade, entry_price, stop_loss, take_profit, lot_size
- outcome (pending/win/loss/breakeven), pnl_r
- mt5_ticket (nullable), execution_source (manual/playbuuk)
- grade_override (boolean, default false) — did trader override the grade threshold?
- pre_trade_emotion (text, nullable) — optional: how trader felt before entry
- post_trade_note (text, nullable) — reflection after trade closes
- notes, created_at

### trading_accounts
- id, user_id, metaapi_account_id, broker_name, account_number, server
- platform (mt4/mt5), account_type (demo/live)
- balance, currency, leverage, is_active, connected_at, last_synced_at

### mentor_requests
- id, mentor_name, mentor_handle, markets, requested_by, vote_count
- status: enum ('open', 'in_progress', 'added', 'declined')
- admin_notes, created_at, updated_at

### mentor_request_votes
- id, request_id, user_id, voted_at
- UNIQUE constraint on (request_id, user_id)

### mentor_payouts
- id, mentor_id, period_start, period_end
- pro_share_amount, direct_amount, total_amount
- status: enum ('accrued', 'pending', 'processing', 'paid', 'failed')
- stripe_transfer_id (nullable), created_at

### mentor_escrow
- id, mentor_id, total_accrued (numeric, default 0)
- last_calculated_at, released (boolean), released_at, released_to_payout_id

---

## Psychology-First Feature Design

### 1. The Checklist as Discipline Engine
The checklist is NOT a learning tool. It's a discipline enforcement system. Auto-detected items remove subjective interpretation. The trader cannot trick themselves into seeing a BOS that isn't there — the system either detects it or it doesn't. Manual items force the trader to consciously acknowledge each criterion before proceeding.

### 2. Setup Grade as Psychology Gate
The grade (A+ to D+) is the trader's objective decision-maker. Instead of asking "do I feel good about this trade?" the trader asks "what does the grade say?" This externalises the decision, removing emotion from the equation. The grade updates in real-time — if a trader is watching a D+ setup hoping it improves, they can see exactly what's missing.

### 3. Trade Execution Gate
The trade panel requires a minimum grade (default C+, configurable). If the setup is below threshold, the "Execute Trade" button is disabled with a clear message: "Setup grade D+ — below your minimum threshold. Wait for better conditions." The trader CAN override this (it's their money), but the override is logged in the journal as `grade_override = true`, creating accountability data.

### 4. Trade Journal as Psychology Mirror
The journal doesn't just track wins/losses. It tracks:
- Which mentor's playbook was used
- What grade the setup was at entry
- Whether the trader overrode the grade threshold
- Optional pre-trade emotion tag
- Post-trade reflection note
- Pattern analysis: "You win 72% on B+ setups but only 31% on overridden D+ setups"

### 5. Pre-Fill as Plan Enforcement
The trade panel pre-fills stop loss, take profit, and lot size from the playbook's risk management rules. The trader can change these — but the original values are visible, making any deviation a conscious act rather than a default.

### 6. Setup Alert Notifications (Stop Chart Staring)
Chart staring is a hidden psychology problem. Traders sit watching charts for hours, get emotionally invested in a pair, and end up forcing trades on D+ setups because they've been waiting too long. Alerts solve this by flipping the dynamic: instead of the trader hunting for setups, the system tells them when conditions are met.

**How it works:**
- The Live Scanner runs continuously across all pairs for all followed mentors' playbooks
- When any playbook's grade crosses the trader's alert threshold (configurable, default A+), a push notification fires
- Notification: "🟢 Alex G playbook: EUR/USD just hit A+ on the 15min — 6/7 checklist items met"
- Tapping the notification opens the playbook viewer for that pair, pre-loaded with the live checklist
- Trader reviews, confirms the manual items, and executes — or dismisses if timing doesn't suit

**Alert settings (per trader):**
- alert_threshold: minimum grade to trigger (A+, B+, C+ — default A+)
- alert_mentors: which followed mentors to monitor (default: all)
- alert_pairs: which pairs to monitor (default: mentor's preferred pairs)
- alert_sessions: only alert during specific sessions (e.g., London + NY only)
- quiet_hours: no alerts between e.g., 22:00–06:00

**Technical implementation:**
- Web Push API via PWA service worker (works on desktop + Android, iOS 16.4+)
- Production (Phase 3): Native push via Expo React Native app
- Backend: Scanner runs as Supabase Edge Function on a cron (every 30 seconds)
- Deduplication: same mentor + pair + grade combination won't re-alert within 30 minutes
- Rate limit: max 10 alerts per hour to prevent notification fatigue

**Psychology benefit:**
"Stop watching charts. Walk away. We'll tell you when your setup is ready."

---

## Setup Alert Database & API

### alert_preferences table
- id (uuid, PK)
- user_id (FK → profiles)
- alert_threshold: enum ('a_plus', 'b_plus', 'c_plus') default 'a_plus'
- alert_mentors (jsonb array of mentor_ids, nullable — null means all followed)
- alert_pairs (jsonb array, nullable — null means mentor's preferred pairs)
- alert_sessions (jsonb array, nullable — e.g., ['london', 'new_york'])
- quiet_hours_start (time, nullable)
- quiet_hours_end (time, nullable)
- push_enabled (boolean, default true)
- created_at, updated_at

### alert_log table
- id (uuid, PK)
- user_id (FK → profiles)
- mentor_id (FK → mentors)
- playbook_id (FK → playbooks)
- pair (text)
- grade (text)
- checklist_score (numeric)
- sent_at (timestamp)
- tapped (boolean, default false)
- tapped_at (timestamp, nullable)
- resulted_in_trade (boolean, default false)
- trade_id (FK → trade_journal, nullable)

### API routes
- GET/PUT /api/alerts/preferences — get/update alert settings
- GET /api/alerts/history — past alerts with tap-through and trade conversion data
- POST /api/alerts/test — send a test notification

### Alert Analytics (for the trader)
- Total alerts received this week/month
- Tap-through rate (how often they opened the playbook from the alert)
- Conversion rate (alerts that led to executed trades)
- Win rate on alert-initiated trades vs. self-initiated trades
- This creates another psychology insight: "Trades initiated from A+ alerts have a 74% win rate vs. 45% on self-initiated trades"

---

## Follow System

### How it works
- Any authenticated user can follow any mentor (free action, no subscription required)
- Follow button on mentor cards and playbook pages (toggle: Follow / Following)
- Following adds mentor to "My Mentors" list
- mentor.follower_count increments/decrements via database trigger
- Follower count is the primary social proof metric

### Follow vs Subscribe
| Action | Cost | Access |
|--------|------|--------|
| Follow | Free | "My Mentors" list, playbook preview (summary, golden rules) |
| Pro subscription | $19.99/mo | Full playbook, live sync, auto-grading, trade execution for ALL followed mentors |
| Mentor Direct | $9.99/mo per mentor | Everything in Pro + exclusive content for that specific mentor |

### Database trigger for follower_count
```sql
CREATE OR REPLACE FUNCTION increment_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mentors SET follower_count = follower_count + 1 WHERE id = NEW.mentor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_follow
AFTER INSERT ON mentor_follows
FOR EACH ROW EXECUTE FUNCTION increment_follower_count();

CREATE OR REPLACE FUNCTION decrement_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mentors SET follower_count = follower_count - 1 WHERE id = OLD.mentor_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_unfollow
AFTER DELETE ON mentor_follows
FOR EACH ROW EXECUTE FUNCTION decrement_follower_count();
```

---

## Mentor Request System

### User flow
1. Trader navigates to /requests, sees existing requests ranked by votes
2. Can vote on existing requests (one vote per user per request)
3. Can submit new request: mentor name + handle + markets
4. System checks for duplicates before creating

### Admin flow
1. Admin sees /admin/requests — ranked by votes
2. Can action: "Add" (triggers AI extraction), "Decline", or "In Progress"
3. Vote count used in outreach: "347 traders voted for your strategy"

---

## Trade Execution Bridge (MetaApi)

### Connection Flow
1. Trader enters broker name, MT5 account number, password, server name
2. Backend calls MetaApi: POST /users/current/accounts
3. MetaApi connects, verifies, returns account ID
4. Playbuuk stores MetaApi account ID only (NOT MT5 password)
5. Balance and positions sync automatically

### Psychology-Gated Execution Flow
1. Trader validates setup on playbook — grade updates live
2. If grade >= threshold (default C+): "Execute Trade" button enabled
3. If grade < threshold: button disabled with message "Setup below your C+ minimum. Wait for better conditions."
4. Trader can override (their money) — but override is logged: grade_override = true
5. On execution: backend calls MetaApi, MT5 ticket returned
6. Trade auto-logged to journal with execution_source='playbuuk', grade, override status

### Risk Controls
- Never auto-executes. Trader always confirms.
- Pre-fills SL/TP/lot from playbook rules — deviation is visible
- Minimum grade threshold configurable (default C+)
- Max lot size cap per account
- Demo accounts clearly labelled
- Grade override logged for accountability

---

## Mentor Onboarding & Escrow Revenue

### Adding mentors (Admin or from user requests)
1. Admin enters name, handle, markets, contact info
2. Claude API extracts strategy → AI draft playbook created
3. Playbook goes live with "AI Draft" label, mentor.user_id = null
4. Usage tracking and revenue accrual start immediately

### Mentor claims and verifies
1. Mentor creates account, admin links user_id
2. Mentor edits playbook in Portal, submits for review
3. Admin approves → verified badge applied
4. Mentor connects Stripe → all accrued escrow released

### Escrow rules
- Revenue accrues from day 1 of playbook being live
- Monthly calc runs for ALL mentors (verified + unverified)
- Verified → Stripe transfer. Unverified → escrow increases.
- Outreach lever: "You have $X waiting + Y followers on Playbuuk"
- Escrow expires after 12 months if unclaimed

---

## Revenue Share Model

### How mentors earn
Revenue driven by USAGE among Pro followers, not raw follower count.

**Pro tier ($19.99/mo):**
- 60% platform / 40% mentor pool
- Usage points: checklist_open (1pt), time_spent (1pt/5min), trade_logged (2pt), trade_executed (3pt)
- Mentor share = their points / total points × 40% of Pro revenue

**Mentor Direct ($9.99/mo per mentor):**
- 50% platform / 50% to specific mentor

**Unverified mentors:**
- Same calculation, payout status = 'accrued' in escrow

---

## Roles & Access

| Route              | trader    | mentor   | admin |
|--------------------|-----------|----------|-------|
| /                  | ✓         | ✓        | ✓     |
| /mentor/[id]       | tier-gated| ✓        | ✓     |
| /scanner           | Pro only  | ✓        | ✓     |
| /journal           | ✓         | ✓        | ✓     |
| /accounts          | ✓         | ✓        | ✓     |
| /requests          | ✓         | ✓        | ✓     |
| /portal/*          | ✗         | ✓        | ✓     |
| /admin/*           | ✗         | ✗        | ✓     |
| API: follow        | ✓         | ✓        | ✓     |
| API: trade execute | Pro only  | ✓        | ✓     |
| API: playbook write| ✗         | own only | ✓     |
| API: add mentor    | ✗         | ✗        | ✓     |
| API: requests      | ✓ (submit/vote) | ✓  | ✓ (manage) |

---

## Free vs Pro Access

| Feature | Free (Following) | Pro ($19.99/mo) | Mentor Direct (+$9.99/mo) |
|---------|-----------------|-----------------|--------------------------|
| Follow mentors | ✓ Unlimited | ✓ | ✓ |
| Playbook preview | Summary + golden rules | ✓ Full | ✓ Full |
| Live market sync | ✗ | ✓ | ✓ |
| Auto-checklist (discipline engine) | ✗ | ✓ | ✓ |
| Setup grading (psychology gate) | ✗ | ✓ | ✓ |
| Trade execution (MT5) | ✗ | ✓ | ✓ |
| Trade journal + psychology insights | Basic (manual) | Full (auto-tagged) | Full |
| Live Scanner | ✗ | ✓ | ✓ |
| Setup alerts (A+/B+ notifications) | ✗ | ✓ | ✓ |
| Request mentors | ✓ | ✓ | ✓ |
| Exclusive mentor content | ✗ | ✗ | ✓ |

---

## Checklist Eval Keys

```
trend_exists, aoi_count_2, price_in_aoi, bos_detected, bos_synced,
engulfing, ema50_near, psych_level, session_active, session_killzone,
tl_3touch, tl_valid_slope, tl_span_week, fvg_detected
```
Items with evalKey = null are manual-only.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
METAAPI_TOKEN=
METAAPI_DOMAIN=agiliumtrade.agiliumtrade.ai
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Playbuuk
```

---

## Coding Conventions

- TypeScript strict. No `any`.
- `zod` for API validation.
- Server Components default. `"use client"` only for interactivity.
- Absolute imports: `@/components`, `@/lib`, `@/stores`
- Files: kebab-case.tsx / camelCase.ts
- Components: PascalCase. DB: snake_case. Stores: use[Name]Store
- TailwindCSS only. Dark theme. Fonts: Outfit (body), IBM Plex Mono (data)
- Trade execution: API routes ONLY. Never call MetaApi from client.
- Market data: Zustand store, 2.5s tick.
- Mutations via API routes, never direct Supabase from client.
- **ALWAYS use the `frontend-design` skill in Claude Code** when building any UI component, page, or layout. Every screen must be visually stunning — not generic.
- **ALWAYS apply SEO best practices** on every page. Use the guidance below.

---

## Design System & Visual Aesthetics

### CRITICAL: Playbuuk Must Look World-Class

This is non-negotiable. Playbuuk is a premium product charging $19.99/month. Every screen, every component, every interaction must feel like it was designed by a top-tier design studio. **Always read the `frontend-design` skill in Claude Code before building any UI component.** No generic AI aesthetics. No cookie-cutter layouts. No default TailwindUI templates without heavy customisation.

### Design Philosophy
- **Theme:** Dark-mode luxury meets trading terminal precision. Think Bloomberg Terminal's information density crossed with a premium fintech app's polish. The aesthetic should feel powerful, trustworthy, and calm — the opposite of the chaotic emotions it's helping traders manage.
- **Emotional design goal:** When a trader opens Playbuuk, they should feel in control. The interface itself is part of the psychology solution — calm, structured, disciplined. The design reinforces the product's core promise.

### Typography (NEVER use generic fonts)
- **Display / Headings:** `"Outfit"` (variable weight, geometric, modern) — or explore `"Satoshi"`, `"Cabinet Grotesk"`, `"General Sans"` for headings if more character is needed. Load via Google Fonts or Fontsource.
- **Body / UI:** `"Outfit"` at regular weight for readability.
- **Data / Prices / Grades:** `"IBM Plex Mono"` — monospace conveys precision, trust, and financial seriousness. Use for all numerical data, prices, grades, timestamps, and the candlestick chart labels.
- **Grade display:** The setup grade (A+, B+, C+, D+) should use `"IBM Plex Mono"` at a large size (2xl–4xl) with the grade colour. This is the most important text on the playbook page.

### Colour System
```css
/* Core surfaces */
--bg: #050810;          /* Deep space black — not pure black */
--surface: #0b1121;     /* Card backgrounds */
--card: #101b30;        /* Elevated cards */
--border: #1a2845;      /* Subtle borders */

/* Accent palette */
--accent: #00e5b0;      /* Primary green — actions, CTAs, verified badges */
--accent-glow: #00e5b033; /* Glow effect for accent elements */
--gold: #fbbf24;        /* A+ grade, premium, highlights */
--red: #ff4d6a;         /* D+ grade, warnings, sell, danger */
--blue: #4d8eff;        /* B+ grade, buy, info, links */
--cyan: #22d3ee;        /* C+ grade, secondary info */

/* Text hierarchy */
--text: #e8edf5;        /* Primary text */
--dim: #6b7fa3;         /* Secondary text */
--muted: #3d5078;       /* Tertiary / disabled */
```

### Visual Effects & Micro-Interactions
- **Grade circle:** Animated SVG ring that fills based on percentage. Colour transitions smoothly when grade changes. Subtle pulse animation on grade upgrade (e.g., C+ → B+). Glow effect using `box-shadow` with grade colour at low opacity.
- **Checklist items:** When auto-detected, items should animate in with a satisfying check animation (not just appearing). Use `framer-motion` or CSS transitions. Green glow pulse on check, red subtle flash on uncheck.
- **Candlestick chart:** Custom-styled with the colour system. AOI zones as translucent overlays. Trendlines with gradient strokes. Price tooltip follows cursor smoothly.
- **Card hover states:** Subtle border glow (`box-shadow: 0 0 20px var(--accent-glow)`), slight scale (`transform: scale(1.01)`), smooth 200ms transition. Never flat — every interactive element should acknowledge the user.
- **Page transitions:** Staggered fade-in on card grids (each card delays 50ms). Smooth skeleton loaders during data fetch. No layout shift.
- **Mentor cards:** Avatar emoji at top, follower count prominently displayed, verification badge with a subtle shine animation, follow button with satisfying click feedback.
- **Trade panel:** The execute button should feel substantial — larger than typical buttons, with a gradient background that pulses subtly when grade is above threshold. When disabled (below threshold), it should look physically locked with a padlock icon.
- **Notifications banner:** Setup alerts that appear in-app should slide down with a glass-morphism card effect, auto-dismiss after 8 seconds, with a progress bar.

### Layout Principles
- **Information density done right:** Trading tools need to show lots of data. Use the dark theme to create visual layers — surface → card → elevated card. Borders are subtle (1px, low opacity). White space between sections, density within sections.
- **Responsive:** Mobile-first. Playbook viewer stacks vertically on mobile (chart → checklist → grade → trade panel). Marketplace grid: 1-col mobile, 2-col tablet, 3-col desktop. Scanner: horizontal scroll on mobile.
- **Navigation:** Left sidebar on desktop (collapsible), bottom tabs on mobile. Sidebar icons from `lucide-react`, with labels visible when expanded.
- **Modals & dialogs:** Trade confirmation, account connection, and override confirmation use centered modals with backdrop blur. Never full-page redirects for quick actions.

### Component Quality Checklist
Before shipping any component, verify:
- [ ] Uses the colour system variables, not hardcoded colours
- [ ] Has hover, focus, and active states
- [ ] Animates state transitions (loading → loaded, unchecked → checked)
- [ ] Looks correct on mobile (375px), tablet (768px), desktop (1440px)
- [ ] Uses the correct font (Outfit for UI, IBM Plex Mono for data)
- [ ] Dark theme only — no light mode consideration needed for MVP
- [ ] Empty states have psychology-framed copy
- [ ] Loading states use skeleton loaders, not spinners

---

## SEO & GEO (Generative Engine Optimisation)

### Why This Matters
Playbuuk targets traders who actively search for solutions to their psychology problems. Queries like "how to stop revenge trading", "trading discipline tools", "FOMO trading solution" are high-intent searches. The site needs to rank for these AND be surfaced by AI assistants (ChatGPT, Perplexity, Google AI Overviews) when traders ask about solving emotional trading.

### SEO Architecture (Apply to EVERY Page)

**Technical SEO (Next.js App Router):**
- Use `generateMetadata()` on every page — never skip metadata
- Dynamic `<title>` and `<meta name="description">` per page with target keywords
- Canonical URLs on all pages
- `robots.txt` and `sitemap.xml` generated via Next.js (`app/sitemap.ts`, `app/robots.ts`)
- Open Graph and Twitter Card meta tags on every public page
- Structured data (JSON-LD) on key pages: Organization, Product, FAQPage, HowTo
- Image alt text on all images (including chart screenshots, mentor avatars)
- Semantic HTML: proper heading hierarchy (h1 → h2 → h3), `<main>`, `<nav>`, `<article>`, `<section>`
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1 — use Next.js Image, lazy loading, font preloading

**Page-Level SEO:**

```typescript
// app/(platform)/page.tsx — Marketplace
export function generateMetadata(): Metadata {
  return {
    title: 'Playbuuk — Trading Discipline Platform | Stop Emotional Trading',
    description: 'AI-powered playbooks that enforce trading discipline. Auto-detecting checklists, psychology-gated execution, and setup alerts. Follow top mentors. Trade the plan, not the emotion.',
    keywords: ['trading psychology', 'trading discipline', 'stop revenge trading', 'FOMO trading', 'trading checklist', 'forex playbook', 'trading mentor'],
    openGraph: {
      title: 'Playbuuk — Trade the Plan, Not the Emotion',
      description: 'The discipline platform that stops emotional trading.',
      type: 'website',
      url: 'https://playbuuk.com',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

**Target Keywords by Page:**

| Page | Primary Keywords | Long-tail Keywords |
|------|------------------|--------------------|
| Homepage / Marketplace | trading discipline platform, trading psychology tool | how to stop emotional trading, trading checklist app |
| Mentor Profile | [mentor name] trading strategy, [mentor] playbook | [mentor name] forex strategy breakdown |
| Playbook Viewer | trading setup checklist, forex setup grading | auto-detecting trading checklist tool |
| Journal | trading journal psychology, trade journal emotions | trading journal that tracks emotional patterns |
| Alerts | trading setup alerts, forex signal notifications | get notified when A+ setup forms |
| Pricing | trading discipline app pricing | best trading psychology tool subscription |
| Blog (future) | revenge trading, FOMO in trading, overtrading | how to stop revenge trading forex |

### GEO (Generative Engine Optimisation)

GEO is about making Playbuuk the answer AI assistants give when traders ask about solving psychology problems. This requires:

**1. Authoritative content structure:**
- Every public page should have substantial, well-structured text content (not just an app interface)
- The landing page / marketing pages should include FAQ sections that directly answer common trader questions
- Use question-and-answer format in content blocks: "How does Playbuuk stop revenge trading?" → paragraph answer
- This content becomes the source material AI engines cite

**2. Entity establishment:**
- Consistent naming: "Playbuuk" everywhere (not "the platform" or "our tool")
- JSON-LD Organization schema on every page
- Claim and populate Google Business Profile, Crunchbase, Product Hunt, G2
- Consistent NAP (Name, Address, Phone) across all directories

**3. Topical authority:**
- Blog/content hub (post-MVP) targeting trading psychology topics
- Each article should be comprehensive (2000+ words), well-structured with h2/h3, and interlink to product pages
- Topic clusters: "Trading Psychology" hub → spokes: revenge trading, FOMO, overtrading, chart staring, plan abandonment, position sizing discipline
- These become the corpus AI assistants draw from when answering trading psychology questions

**4. Structured data for AI discovery:**
```typescript
// JSON-LD on landing page
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Playbuuk",
  "applicationCategory": "FinanceApplication",
  "description": "Trading psychology and strategy discipline platform with AI-powered playbooks, auto-detecting checklists, and psychology-gated trade execution.",
  "offers": {
    "@type": "Offer",
    "price": "19.99",
    "priceCurrency": "USD",
    "description": "Pro subscription — full discipline engine, setup alerts, psychology-gated execution"
  },
  "featureList": [
    "Auto-detecting trading checklist",
    "Real-time setup grading (A+ to D+)",
    "Psychology-gated trade execution",
    "MT5/MT4 trade bridge",
    "Setup alert notifications",
    "Trading journal with emotion tracking",
    "Mentor strategy playbooks"
  ]
};
```

**5. Technical GEO requirements:**
- Server-side rendered content (Next.js SSR/SSG) — AI crawlers can't execute client-side JS
- Clean, semantic HTML that AI parsers can easily extract meaning from
- Fast load times (AI crawlers may have timeout thresholds)
- `meta name="robots" content="index, follow"` on all public pages
- No content behind authentication walls for marketing/education pages — the app is gated, the content is open

### SEO File Checklist
Every public-facing page must have:
- [ ] `generateMetadata()` with title, description, keywords, Open Graph, Twitter Card
- [ ] Proper heading hierarchy (single h1, logical h2/h3 nesting)
- [ ] Semantic HTML tags
- [ ] JSON-LD structured data where applicable
- [ ] Alt text on all images
- [ ] Internal links to related pages
- [ ] Mobile-responsive (Google indexes mobile-first)
- [ ] No render-blocking resources for above-the-fold content

---

## Build Order

**Sprint 1 (W1-2): Foundation**
Next.js 14, Supabase, Prisma, Auth, Stripe test, Vercel, seed data (3 verified + 3 unverified mentors)

**Sprint 2 (W3-4): Auth + Subscriptions + Follow**
Login, profiles, Stripe Checkout, webhooks, tier gates, follow/unfollow system, Connect

**Sprint 3 (W5-6): Marketplace + Playbook**
Mentor grid with follower counts + follow buttons, playbook viewer, API routes, verified vs draft badges, tier-gated access

**Sprint 4 (W7-8): Live Market Engine + Discipline System**
Simulation, indicators, chart, live checklist (discipline enforcer), auto-evaluation, psychology-gated setup grade, pair scanner

**Sprint 5 (W9): Trade Bridge + Psychology Gate**
MetaApi integration, connect flow, psychology-gated trade panel, grade threshold enforcement, override logging, positions, auto-journal

**Sprint 6 (W10): Portal + Admin + Requests**
Mentor portal (editor, analytics, follower stats, revenue), admin (add-mentor, pipeline, escrow), user mentor requests + voting

**Sprint 7 (W11): Journal + Psychology Insights + Alerts + Payments**
Tagged journal with emotion/override tracking, psychology pattern analysis, setup alert notifications (Web Push via PWA), alert preferences UI, alert deduplication, usage tracking, payout calc, escrow release

**Sprint 8 (W12): PWA + Polish + Launch**
PWA config + push notification service worker, alert testing, E2E testing, disclaimers, admin seeds 5-10 draft mentors, outreach begins, beta launch

---

## Phase Roadmap

### Phase 1 — MVP (Weeks 1–12) ✦ Current Build
Everything above. PWA web platform with discipline engine, psychology-gated execution, setup alerts, follow system, mentor requests, escrow revenue. Simulated market data.

### Phase 2 — Growth (Months 4–9)
- **Live market data** — Replace simulation with Twelve Data API (~$29/mo). Real prices, real candlesticks, real indicator calculations. The discipline engine becomes fully production-grade.
- **Discipline Score** — Rolling metric (0–100) tracking consistency over time. Calculated from: grade compliance rate, override frequency, alert response rate, emotion pattern stability. Visible on trader's dashboard. Trends over weeks. The "am I improving?" number.
- **AI Post-Session Debrief Agent (Claude Managed Agents)** — Persistent agent deployed via Anthropic's Managed Agents infrastructure. Runs autonomously at the end of each trading session or daily on a schedule. Pulls the trader's full journal history (not just today), cross-references with alert logs, override history, emotion tags, and grade compliance trends. Generates a personalised debrief: "This week you overrode 4 times, all during NY session on FOMO-tagged trades. Your NY session override win rate is 12%. Consider restricting alerts to London only." Follows up in the next session: "Last week I suggested restricting to London. You did — your compliance went from 68% to 91%. Win rate improved 14 points." Managed state means the agent remembers context across sessions without passing full history every call. At $0.08/hr runtime, running one debrief agent per trader for 5 minutes daily costs essentially nothing.
- **Mentor Strategy Extraction Agent (Claude Managed Agents)** — Replaces the single-shot AI extraction API call with a multi-step research agent. Runs a thorough workflow: searches YouTube transcripts, then Twitter/X posts, then blog content, then TikTok descriptions. Cross-references findings across sources to validate accuracy. Builds the playbook iteratively — draft, self-critique, refine, verify consistency. Takes 2–3 minutes instead of one pass, producing significantly higher quality playbooks. Runs in the background while admin does other work, notifies when complete. Makes the verification step faster and the outreach pitch stronger.
- **Community reviews and ratings** — Traders rate mentor playbooks. Reviews weighted by reviewer's grade compliance and win rate — a 5-star review from an 85% compliance trader carries more weight.
- **cTrader support** — MetaApi already supports cTrader. Add as a platform option in trading_accounts.
- **Side-by-side playbook comparison** — Compare two mentors' playbooks on the same pair.
- **Advanced alert analytics** — Heatmaps: which sessions, pairs, and mentors produce the most A+ alerts.

### Phase 3 — Scale (Months 9–18)
- **Native mobile app (Expo React Native)** — Native push notifications (full iOS), smoother charts, App Store / Play Store presence.
- **Prop firm challenge mode** — Partner with FTMO, MyFundedFX. Grade threshold becomes the risk management tool for funded challenges. Referral/integration commission.
- **TradingView integration** — Overlay plugin: Playbuuk checklist and grade on TradingView charts.
- **Mentor course integration** — Link Teachable, Kajabi courses as Mentor Direct exclusive content.
- **Referral commission system** — 20% recurring commission on referred Pro subscriptions. $5 bonus on first trade execution. Referral page shows referrer's discipline stats as social proof.
- **Third-party API** — Other tools (TradeZella, Edgewonk) pull grade data and discipline metrics.
- **White-label** — Trading communities and prop firms embed Playbuuk's discipline engine.

---

## Claude Managed Agents Integration (Phase 2)

### Why Managed Agents
Two features in Phase 2 require persistent, stateful, multi-step AI workflows that go beyond simple API calls. Claude Managed Agents provides managed hosting, automatic scaling, state management, error recovery, and session persistence — removing the infrastructure overhead.

### Debrief Agent Architecture
```
Agent: playbuuk-debrief
Trigger: Scheduled (end of trading session or daily at user's configured time)
Tools:
  - Supabase read (journal entries, alert_log, override history, emotion data)
  - Playbuuk internal API (grade compliance calculation, pattern detection)
  - Claude analysis (trend identification, recommendation generation)
State:
  - Previous debrief recommendations (persisted across sessions)
  - Trader's historical compliance trajectory
  - Action items and follow-up tracking
Output:
  - Personalised debrief message (stored in new debrief_history table)
  - Delivered via in-app notification + optional push
  - Surfaced on trader's dashboard as "Today's Debrief" card
```

### Extraction Agent Architecture
```
Agent: playbuuk-extractor
Trigger: Admin initiates via /admin/add-mentor
Tools:
  - Web search (YouTube, Twitter/X, TikTok, blogs, forums)
  - Content analysis (extract strategy elements from transcripts/posts)
  - Self-critique (compare extracted rules against known trading methodologies)
  - Playbook schema validation (ensure output matches JSONB structure)
State:
  - Research findings accumulated across multiple searches
  - Confidence scores per extracted element
  - Sources list for admin review
Output:
  - Complete playbook JSON matching the schema
  - Confidence report per section
  - Sources cited for admin verification
  - Stored as playbook with is_ai_draft=true
```

### New Database Table (Phase 2)
```
debrief_history
  - id (uuid, PK)
  - user_id (FK → profiles)
  - session_date (date)
  - debrief_content (text — the personalised analysis)
  - recommendations (jsonb — actionable items)
  - follow_up_on (jsonb, nullable — previous recommendations being tracked)
  - compliance_snapshot (jsonb — grade compliance, override rate, etc. at time of debrief)
  - created_at
```

### Cost Estimate
- Debrief agent: ~5 min per trader per day × $0.08/hr = ~$0.007 per debrief + Claude API token cost
- Extraction agent: ~3 min per mentor × $0.08/hr = ~$0.004 per extraction + Claude API token cost
- At 1,000 Pro traders: ~$7/day for daily debriefs = ~$210/month (trivial vs revenue)

---

## Key Marketing Messages

- **Tagline:** "Trade the plan, not the emotion."
- **Subhead:** "AI-powered playbooks that enforce strategy discipline — so you stop overtrading, revenge trading, and FOMOing into bad setups."
- **Mentor CTA:** "Follow me on Playbuuk"
- **Value prop (traders):** "Your strategy works. Your psychology doesn't. Playbuuk fixes the gap."
- **Value prop (mentors):** "Your followers already know your strategy. Help them actually follow it — and earn recurring revenue while they do."

---

## Important Notes

- **ALWAYS use the `frontend-design` skill in Claude Code** when building any page or component. No exceptions. Every screen must be visually premium — not generic.
- **ALWAYS apply SEO/GEO** on every public-facing page. Use `generateMetadata()`, JSON-LD, semantic HTML, proper headings, alt text. See the SEO section above.
- **Every page** displays the disclaimer: "Not financial advice. Trading carries substantial risk."
- **Playbuuk never stores MT5 passwords.** Only MetaApi account IDs.
- **Trade execution never auto-fires.** Trader always confirms.
- **Grade overrides are always logged.** This is non-negotiable accountability data.
- **Unverified mentor playbooks** show "AI-Extracted Draft — Pending Mentor Review" label.
- **Escrow expires 12 months** if mentor doesn't claim. Documented in ToS.
- **Follower count** is the vanity metric mentors promote. **Usage among Pro followers** drives revenue.
- **Setup alerts** are Pro-only. Default threshold: A+. Max 10/hour. 30-min dedup window.
- **No generic aesthetics.** Every component must feel premium. Read the design system section above.
- **Frame everything through psychology.** Never "invalid" — always "below your minimum threshold. Wait for better conditions."
