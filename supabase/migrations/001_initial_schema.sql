-- =============================================================================
-- Playbuuk — Initial Schema Migration
-- Run this in the Supabase SQL editor (or via supabase db push).
--
-- Covers:
--   1. Custom enum types
--   2. All 14 tables (profiles must mirror auth.users)
--   3. follower_count trigger functions + triggers
--   4. Auto-create profile on sign-up trigger
--   5. Row Level Security (RLS) policies
--   6. Indexes (supplementing what Prisma creates)
-- =============================================================================

-- ─── 0. Extensions ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy search on mentor names


-- ─── 1. Enum types ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('trader', 'mentor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tier AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'admin_added', 'draft_ready', 'invitation_sent',
    'under_review', 'verified', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'mentor_direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'checklist_open', 'time_spent', 'trade_logged', 'trade_executed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE direction AS ENUM ('long', 'short');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_outcome AS ENUM ('pending', 'win', 'loss', 'breakeven');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE execution_source AS ENUM ('manual', 'playbuuk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform AS ENUM ('mt4', 'mt5');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('demo', 'live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'added', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM (
    'accrued', 'pending', 'processing', 'paid', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_threshold AS ENUM ('a_plus', 'b_plus', 'c_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 2. Tables ────────────────────────────────────────────────────────────────

-- profiles — mirrors auth.users, created automatically on sign-up (see trigger §4)
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                role        NOT NULL DEFAULT 'trader',
  display_name        TEXT,
  avatar_url          TEXT,
  tier                tier        NOT NULL DEFAULT 'free',
  stripe_customer_id  TEXT        UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- mentors — user_id is NULL until the real mentor claims the profile
CREATE TABLE IF NOT EXISTS mentors (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID             UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  display_name        TEXT             NOT NULL,
  handle              TEXT             NOT NULL UNIQUE,
  bio                 TEXT,
  avatar_emoji        TEXT             DEFAULT '🎯',
  markets             JSONB            NOT NULL DEFAULT '[]',
  style               TEXT,
  signature           TEXT,
  follower_count      INTEGER          NOT NULL DEFAULT 0,
  external_followers  TEXT,
  rating              NUMERIC(3,2),
  review_count        INTEGER          NOT NULL DEFAULT 0,
  verified            BOOLEAN          NOT NULL DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  stripe_connect_id   TEXT             UNIQUE,
  onboarding_status   onboarding_status NOT NULL DEFAULT 'admin_added',
  added_by            UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  contact_info        TEXT,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- mentor_follows — free follow action, drives follower_count via trigger
CREATE TABLE IF NOT EXISTS mentor_follows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id   UUID        NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mentor_id)
);

-- playbooks — core content unit; checklist is JSONB [{id,item,category,weight,auto,evalKey}]
CREATE TABLE IF NOT EXISTS playbooks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id           UUID        NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  strategy_name       TEXT        NOT NULL,
  summary             TEXT,
  timeframes          JSONB       NOT NULL DEFAULT '[]',
  core_concepts       JSONB       NOT NULL DEFAULT '[]',
  entry_rules         JSONB       NOT NULL DEFAULT '[]',
  exit_rules          JSONB       NOT NULL DEFAULT '[]',
  risk_management     JSONB       NOT NULL DEFAULT '{}',
  indicators          JSONB       NOT NULL DEFAULT '[]',
  checklist           JSONB       NOT NULL DEFAULT '[]',
  golden_rules        JSONB       NOT NULL DEFAULT '[]',
  common_mistakes     JSONB       NOT NULL DEFAULT '[]',
  preferred_pairs     JSONB       NOT NULL DEFAULT '[]',
  session_preference  TEXT,
  is_verified         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_ai_draft         BOOLEAN     NOT NULL DEFAULT TRUE,
  version             INTEGER     NOT NULL DEFAULT 1,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subscriptions — Stripe subscription per user (multiple rows for mentor_direct)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier                    subscription_tier   NOT NULL DEFAULT 'free',
  mentor_id               UUID                REFERENCES mentors(id) ON DELETE SET NULL,
  stripe_subscription_id  TEXT                UNIQUE,
  status                  subscription_status NOT NULL DEFAULT 'active',
  period_start            TIMESTAMPTZ,
  period_end              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- playbook_usage — powers mentor revenue-share calculation
CREATE TABLE IF NOT EXISTS playbook_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playbook_id      UUID        NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  event_type       event_type  NOT NULL,
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trade_journal — psychology-enriched trade log; grade_override is non-negotiable
CREATE TABLE IF NOT EXISTS trade_journal (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playbook_id         UUID             REFERENCES playbooks(id) ON DELETE SET NULL,
  pair                TEXT             NOT NULL,
  direction           direction        NOT NULL,
  risk_r              NUMERIC(5,2),
  setup_grade         TEXT,
  entry_price         NUMERIC(12,5),
  stop_loss           NUMERIC(12,5),
  take_profit         NUMERIC(12,5),
  lot_size            NUMERIC(8,2),
  outcome             trade_outcome    NOT NULL DEFAULT 'pending',
  pnl_r               NUMERIC(8,2),
  mt5_ticket          TEXT,
  execution_source    execution_source NOT NULL DEFAULT 'manual',
  grade_override      BOOLEAN          NOT NULL DEFAULT FALSE,
  pre_trade_emotion   TEXT,
  post_trade_note     TEXT,
  notes               TEXT,
  alert_initiated     BOOLEAN          NOT NULL DEFAULT FALSE,
  alert_id            UUID,            -- FK wired after alert_log is created (below)
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- trading_accounts — MetaApi account IDs only; NEVER store MT5 passwords
CREATE TABLE IF NOT EXISTS trading_accounts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metaapi_account_id  TEXT        NOT NULL UNIQUE,
  broker_name         TEXT        NOT NULL,
  account_number      TEXT        NOT NULL,
  server              TEXT        NOT NULL,
  platform            platform    NOT NULL DEFAULT 'mt5',
  account_type        account_type NOT NULL DEFAULT 'demo',
  balance             NUMERIC(12,2),
  currency            TEXT        NOT NULL DEFAULT 'USD',
  leverage            INTEGER,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  connected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at      TIMESTAMPTZ
);

-- mentor_requests — user-submitted requests; vote_count is denormalised for sort
CREATE TABLE IF NOT EXISTS mentor_requests (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_name    TEXT           NOT NULL,
  mentor_handle  TEXT,
  markets        JSONB          NOT NULL DEFAULT '[]',
  requested_by   UUID           NOT NULL REFERENCES profiles(id),
  vote_count     INTEGER        NOT NULL DEFAULT 1,
  status         request_status NOT NULL DEFAULT 'open',
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- mentor_request_votes — one vote per user per request
CREATE TABLE IF NOT EXISTS mentor_request_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID        NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

-- mentor_payouts — monthly payout records for verified mentors
CREATE TABLE IF NOT EXISTS mentor_payouts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id           UUID          NOT NULL REFERENCES mentors(id),
  period_start        TIMESTAMPTZ   NOT NULL,
  period_end          TIMESTAMPTZ   NOT NULL,
  pro_share_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  direct_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              payout_status NOT NULL DEFAULT 'accrued',
  stripe_transfer_id  TEXT          UNIQUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- mentor_escrow — accrued revenue for unverified mentors; expires after 12 months
CREATE TABLE IF NOT EXISTS mentor_escrow (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id             UUID        NOT NULL UNIQUE REFERENCES mentors(id),
  total_accrued         NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released              BOOLEAN     NOT NULL DEFAULT FALSE,
  released_at           TIMESTAMPTZ,
  released_to_payout_id UUID
);

-- alert_preferences — one row per user, upserted on first save
CREATE TABLE IF NOT EXISTS alert_preferences (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID             NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  alert_threshold     alert_threshold  NOT NULL DEFAULT 'a_plus',
  alert_mentors       JSONB,           -- NULL = all followed mentors
  alert_pairs         JSONB,           -- NULL = mentor's preferred_pairs
  alert_sessions      JSONB,           -- NULL = any session; e.g. ["london","new_york"]
  quiet_hours_start   TEXT,            -- "22:00"
  quiet_hours_end     TEXT,            -- "06:00"
  push_enabled        BOOLEAN          NOT NULL DEFAULT TRUE,
  push_subscription   JSONB,           -- Web Push subscription: {endpoint, keys:{p256dh,auth}}
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- alert_log — every push notification sent; tracks tap + trade conversion
CREATE TABLE IF NOT EXISTS alert_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id         UUID        NOT NULL REFERENCES mentors(id),
  playbook_id       UUID        NOT NULL REFERENCES playbooks(id),
  pair              TEXT        NOT NULL,
  grade             TEXT        NOT NULL,
  checklist_score   NUMERIC(5,2) NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tapped            BOOLEAN     NOT NULL DEFAULT FALSE,
  tapped_at         TIMESTAMPTZ,
  resulted_in_trade BOOLEAN     NOT NULL DEFAULT FALSE,
  trade_id          UUID        REFERENCES trade_journal(id) ON DELETE SET NULL
);

-- Wire deferred FK: trade_journal.alert_id → alert_log.id
ALTER TABLE trade_journal
  ADD CONSTRAINT fk_trade_journal_alert_id
  FOREIGN KEY (alert_id) REFERENCES alert_log(id) ON DELETE SET NULL;


-- ─── 3. Indexes ───────────────────────────────────────────────────────────────

-- mentors
CREATE INDEX IF NOT EXISTS idx_mentors_verified          ON mentors (verified);
CREATE INDEX IF NOT EXISTS idx_mentors_onboarding_status ON mentors (onboarding_status);
CREATE INDEX IF NOT EXISTS idx_mentors_follower_count    ON mentors (follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_mentors_added_by          ON mentors (added_by);
-- Full-text search on mentor display_name + handle
CREATE INDEX IF NOT EXISTS idx_mentors_display_name_trgm ON mentors USING GIN (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mentors_handle_trgm       ON mentors USING GIN (handle gin_trgm_ops);

-- mentor_follows
CREATE INDEX IF NOT EXISTS idx_mentor_follows_user_id   ON mentor_follows (user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_follows_mentor_id ON mentor_follows (mentor_id);

-- playbooks
CREATE INDEX IF NOT EXISTS idx_playbooks_mentor_id              ON playbooks (mentor_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_verified_draft         ON playbooks (is_verified, is_ai_draft);
CREATE INDEX IF NOT EXISTS idx_playbooks_published_at           ON playbooks (published_at DESC);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier   ON subscriptions (user_id, tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mentor_id   ON subscriptions (mentor_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status      ON subscriptions (status);

-- playbook_usage
CREATE INDEX IF NOT EXISTS idx_playbook_usage_playbook_type ON playbook_usage (playbook_id, event_type);
CREATE INDEX IF NOT EXISTS idx_playbook_usage_user_id       ON playbook_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_usage_created_at    ON playbook_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_usage_playbook_date ON playbook_usage (playbook_id, created_at DESC);

-- trade_journal
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_date     ON trade_journal (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_outcome  ON trade_journal (user_id, outcome);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_override ON trade_journal (user_id, grade_override);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_grade    ON trade_journal (user_id, setup_grade);
CREATE INDEX IF NOT EXISTS idx_trade_journal_user_alert    ON trade_journal (user_id, alert_initiated);
CREATE INDEX IF NOT EXISTS idx_trade_journal_playbook_id   ON trade_journal (playbook_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_pair_date     ON trade_journal (pair, created_at DESC);

-- trading_accounts
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_active ON trading_accounts (user_id, is_active);

-- mentor_requests
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status_votes ON mentor_requests (status, vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_requested_by ON mentor_requests (requested_by);

-- mentor_payouts
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_mentor_period ON mentor_payouts (mentor_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_payouts_status        ON mentor_payouts (status);

-- mentor_escrow
CREATE INDEX IF NOT EXISTS idx_mentor_escrow_released ON mentor_escrow (released);

-- alert_log
CREATE INDEX IF NOT EXISTS idx_alert_log_user_date        ON alert_log (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_user_converted   ON alert_log (user_id, resulted_in_trade);
-- Dedup check: same mentor+pair+grade within 30-minute window
CREATE INDEX IF NOT EXISTS idx_alert_log_dedup            ON alert_log (mentor_id, pair, grade, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_playbook_id      ON alert_log (playbook_id);


-- ─── 4. Auto-create profile on sign-up ────────────────────────────────────────
-- Fires after a new user is inserted into auth.users (via Supabase Auth).
-- Populates profiles with id + any metadata the user provided at sign-up.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─── 5. follower_count triggers ────────────────────────────────────────────────
-- Increment when a follow row is inserted; decrement on delete.
-- Application code must NEVER update follower_count directly.

CREATE OR REPLACE FUNCTION increment_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mentors
  SET follower_count = follower_count + 1,
      updated_at     = NOW()
  WHERE id = NEW.mentor_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mentors
  SET follower_count = GREATEST(follower_count - 1, 0),  -- never go below 0
      updated_at     = NOW()
  WHERE id = OLD.mentor_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_follow   ON mentor_follows;
DROP TRIGGER IF EXISTS on_unfollow ON mentor_follows;

CREATE TRIGGER on_follow
  AFTER INSERT ON mentor_follows
  FOR EACH ROW EXECUTE FUNCTION increment_follower_count();

CREATE TRIGGER on_unfollow
  AFTER DELETE ON mentor_follows
  FOR EACH ROW EXECUTE FUNCTION decrement_follower_count();


-- ─── 6. updated_at auto-update trigger ────────────────────────────────────────
-- Keeps updated_at current without relying on application-level updates.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to every table that has updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'mentors', 'playbooks', 'subscriptions',
    'trade_journal', 'mentor_requests', 'mentor_payouts',
    'alert_preferences'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_%1$s_updated_at ON %1$s;
      CREATE TRIGGER set_%1$s_updated_at
        BEFORE UPDATE ON %1$s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t);
  END LOOP;
END;
$$;


-- ─── 7. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_follows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_usage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_journal      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_payouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_escrow      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log          ENABLE ROW LEVEL SECURITY;

-- ── profiles ──
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── mentors — public read; write via service role only ──
CREATE POLICY "Mentors are publicly readable"
  ON mentors FOR SELECT
  TO authenticated, anon
  USING (TRUE);

CREATE POLICY "Mentor can update own record"
  ON mentors FOR UPDATE
  USING (auth.uid() = user_id);

-- ── mentor_follows ──
CREATE POLICY "Users can see their own follows"
  ON mentor_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow mentors"
  ON mentor_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow mentors"
  ON mentor_follows FOR DELETE
  USING (auth.uid() = user_id);

-- ── playbooks — public read (tier gate is in application layer) ──
CREATE POLICY "Playbooks are publicly readable"
  ON playbooks FOR SELECT
  TO authenticated, anon
  USING (TRUE);

CREATE POLICY "Mentors can update own playbooks"
  ON playbooks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mentors
      WHERE mentors.id = playbooks.mentor_id
        AND mentors.user_id = auth.uid()
    )
  );

-- ── subscriptions ──
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ── playbook_usage ──
CREATE POLICY "Users can insert own usage events"
  ON playbook_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own usage"
  ON playbook_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ── trade_journal ──
CREATE POLICY "Users can manage own trades"
  ON trade_journal FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── trading_accounts ──
CREATE POLICY "Users can manage own trading accounts"
  ON trading_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── mentor_requests — authenticated users can read all; submit own ──
CREATE POLICY "Authenticated users can read all requests"
  ON mentor_requests FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can submit requests"
  ON mentor_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- ── mentor_request_votes ──
CREATE POLICY "Users can read all votes"
  ON mentor_request_votes FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can vote once per request"
  ON mentor_request_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── mentor_payouts — mentor can read own ──
CREATE POLICY "Mentors can read own payouts"
  ON mentor_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mentors
      WHERE mentors.id = mentor_payouts.mentor_id
        AND mentors.user_id = auth.uid()
    )
  );

-- ── mentor_escrow — mentor can read own ──
CREATE POLICY "Mentors can read own escrow"
  ON mentor_escrow FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mentors
      WHERE mentors.id = mentor_escrow.mentor_id
        AND mentors.user_id = auth.uid()
    )
  );

-- ── alert_preferences ──
CREATE POLICY "Users can manage own alert preferences"
  ON alert_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── alert_log ──
CREATE POLICY "Users can read own alert log"
  ON alert_log FOR SELECT
  USING (auth.uid() = user_id);
