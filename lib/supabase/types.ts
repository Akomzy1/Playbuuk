// lib/supabase/types.ts
// TypeScript types for the Supabase database schema.
// Mirrors the 14 tables in prisma/schema.prisma.
// Used to type the Supabase client: createClient<Database>()
//
// IMPORTANT: Every table must include `Relationships: []` to satisfy the
// GenericTable constraint in @supabase/supabase-js v2.103+. Missing this
// field causes all table query results to collapse to `never`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'trader' | 'mentor' | 'admin'
export type Tier = 'free' | 'pro'
export type OnboardingStatus =
  | 'admin_added'
  | 'draft_ready'
  | 'invitation_sent'
  | 'under_review'
  | 'verified'
  | 'withdrawn'
export type SubscriptionTier = 'free' | 'pro' | 'mentor_direct'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete'
export type EventType = 'checklist_open' | 'time_spent' | 'trade_logged' | 'trade_executed'
export type Direction = 'long' | 'short'
export type TradeOutcome = 'pending' | 'win' | 'loss' | 'breakeven'
export type ExecutionSource = 'manual' | 'playbuuk'
export type Platform = 'mt4' | 'mt5'
export type AccountType = 'demo' | 'live'
export type RequestStatus = 'open' | 'in_progress' | 'added' | 'declined'
export type PayoutStatus = 'accrued' | 'pending' | 'processing' | 'paid' | 'failed'
export type AlertThreshold = 'a_plus' | 'b_plus' | 'c_plus'

// ─── Checklist item type (stored in playbooks.checklist JSONB) ────────────────

export interface ChecklistItem {
  id: string
  item: string
  category: string
  weight: number
  auto: boolean
  /** null = manual only | string key = auto-evaluated by lib/playbook/evaluator.ts */
  evalKey: string | null
}

// ─── Risk management config (stored in playbooks.risk_management JSONB) ───────

export interface RiskManagement {
  risk_per_trade_pct?: number   // e.g. 1 = 1% of account per trade
  rr_ratio?: number             // e.g. 2 = 1:2 risk:reward minimum
  max_daily_loss_pct?: number
  max_lot_size?: number
  preferred_lot_size?: number
}

// ─── Database shape ───────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Role
          display_name: string | null
          avatar_url: string | null
          tier: Tier
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string               // Must match auth.users id
          role?: Role
          display_name?: string | null
          avatar_url?: string | null
          tier?: Tier
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: Role
          display_name?: string | null
          avatar_url?: string | null
          tier?: Tier
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      mentors: {
        Row: {
          id: string
          user_id: string | null
          display_name: string
          handle: string
          bio: string | null
          avatar_emoji: string | null
          markets: Json
          style: string | null
          signature: string | null
          follower_count: number
          external_followers: string | null
          rating: number | null
          review_count: number
          verified: boolean
          verified_at: string | null
          stripe_connect_id: string | null
          onboarding_status: OnboardingStatus
          added_by: string | null
          contact_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          display_name: string
          handle: string
          bio?: string | null
          avatar_emoji?: string | null
          markets?: Json
          style?: string | null
          signature?: string | null
          follower_count?: number
          external_followers?: string | null
          rating?: number | null
          review_count?: number
          verified?: boolean
          verified_at?: string | null
          stripe_connect_id?: string | null
          onboarding_status?: OnboardingStatus
          added_by?: string | null
          contact_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string | null
          display_name?: string
          handle?: string
          bio?: string | null
          avatar_emoji?: string | null
          markets?: Json
          style?: string | null
          signature?: string | null
          follower_count?: number
          external_followers?: string | null
          rating?: number | null
          review_count?: number
          verified?: boolean
          verified_at?: string | null
          stripe_connect_id?: string | null
          onboarding_status?: OnboardingStatus
          added_by?: string | null
          contact_info?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      mentor_follows: {
        Row: {
          id: string
          user_id: string
          mentor_id: string
          followed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mentor_id: string
          followed_at?: string
        }
        Update: {
          followed_at?: string
        }
        Relationships: []
      }

      playbooks: {
        Row: {
          id: string
          mentor_id: string
          strategy_name: string
          summary: string | null
          timeframes: Json
          core_concepts: Json
          entry_rules: Json
          exit_rules: Json
          risk_management: Json
          indicators: Json
          checklist: Json          // ChecklistItem[]
          golden_rules: Json
          common_mistakes: Json
          preferred_pairs: Json
          session_preference: string | null
          is_verified: boolean
          is_ai_draft: boolean
          version: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          strategy_name: string
          summary?: string | null
          timeframes?: Json
          core_concepts?: Json
          entry_rules?: Json
          exit_rules?: Json
          risk_management?: Json
          indicators?: Json
          checklist?: Json
          golden_rules?: Json
          common_mistakes?: Json
          preferred_pairs?: Json
          session_preference?: string | null
          is_verified?: boolean
          is_ai_draft?: boolean
          version?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          strategy_name?: string
          summary?: string | null
          timeframes?: Json
          core_concepts?: Json
          entry_rules?: Json
          exit_rules?: Json
          risk_management?: Json
          indicators?: Json
          checklist?: Json
          golden_rules?: Json
          common_mistakes?: Json
          preferred_pairs?: Json
          session_preference?: string | null
          is_verified?: boolean
          is_ai_draft?: boolean
          version?: number
          published_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: SubscriptionTier
          mentor_id: string | null
          stripe_subscription_id: string | null
          status: SubscriptionStatus
          period_start: string | null
          period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: SubscriptionTier
          mentor_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tier?: SubscriptionTier
          mentor_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          period_start?: string | null
          period_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      playbook_usage: {
        Row: {
          id: string
          user_id: string
          playbook_id: string
          event_type: EventType
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          playbook_id: string
          event_type: EventType
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          duration_seconds?: number | null
        }
        Relationships: []
      }

      trade_journal: {
        Row: {
          id: string
          user_id: string
          playbook_id: string | null
          pair: string
          direction: Direction
          risk_r: number | null
          setup_grade: string | null
          entry_price: number | null
          stop_loss: number | null
          take_profit: number | null
          lot_size: number | null
          outcome: TradeOutcome
          pnl_r: number | null
          mt5_ticket: string | null
          execution_source: ExecutionSource
          grade_override: boolean
          pre_trade_emotion: string | null
          post_trade_note: string | null
          notes: string | null
          alert_initiated: boolean
          alert_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          playbook_id?: string | null
          pair: string
          direction: Direction
          risk_r?: number | null
          setup_grade?: string | null
          entry_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          lot_size?: number | null
          outcome?: TradeOutcome
          pnl_r?: number | null
          mt5_ticket?: string | null
          execution_source?: ExecutionSource
          grade_override?: boolean
          pre_trade_emotion?: string | null
          post_trade_note?: string | null
          notes?: string | null
          alert_initiated?: boolean
          alert_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          playbook_id?: string | null
          pair?: string
          direction?: Direction
          risk_r?: number | null
          setup_grade?: string | null
          entry_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          lot_size?: number | null
          outcome?: TradeOutcome
          pnl_r?: number | null
          mt5_ticket?: string | null
          execution_source?: ExecutionSource
          grade_override?: boolean
          pre_trade_emotion?: string | null
          post_trade_note?: string | null
          notes?: string | null
          alert_initiated?: boolean
          alert_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      trading_accounts: {
        Row: {
          id: string
          user_id: string
          metaapi_account_id: string
          broker_name: string
          account_number: string
          server: string
          platform: Platform
          account_type: AccountType
          balance: number | null
          currency: string
          leverage: number | null
          is_active: boolean
          connected_at: string
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          metaapi_account_id: string
          broker_name: string
          account_number: string
          server: string
          platform?: Platform
          account_type?: AccountType
          balance?: number | null
          currency?: string
          leverage?: number | null
          is_active?: boolean
          connected_at?: string
          last_synced_at?: string | null
        }
        Update: {
          broker_name?: string
          account_number?: string
          server?: string
          platform?: Platform
          account_type?: AccountType
          balance?: number | null
          currency?: string
          leverage?: number | null
          is_active?: boolean
          last_synced_at?: string | null
        }
        Relationships: []
      }

      mentor_requests: {
        Row: {
          id: string
          mentor_name: string
          mentor_handle: string | null
          markets: Json
          requested_by: string
          vote_count: number
          status: RequestStatus
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentor_name: string
          mentor_handle?: string | null
          markets?: Json
          requested_by: string
          vote_count?: number
          status?: RequestStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          mentor_name?: string
          mentor_handle?: string | null
          markets?: Json
          vote_count?: number
          status?: RequestStatus
          admin_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      mentor_request_votes: {
        Row: {
          id: string
          request_id: string
          user_id: string
          voted_at: string
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          voted_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }

      mentor_payouts: {
        Row: {
          id: string
          mentor_id: string
          period_start: string
          period_end: string
          pro_share_amount: number
          direct_amount: number
          total_amount: number
          status: PayoutStatus
          stripe_transfer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mentor_id: string
          period_start: string
          period_end: string
          pro_share_amount?: number
          direct_amount?: number
          total_amount?: number
          status?: PayoutStatus
          stripe_transfer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          pro_share_amount?: number
          direct_amount?: number
          total_amount?: number
          status?: PayoutStatus
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      mentor_escrow: {
        Row: {
          id: string
          mentor_id: string
          total_accrued: number
          last_calculated_at: string
          released: boolean
          released_at: string | null
          released_to_payout_id: string | null
        }
        Insert: {
          id?: string
          mentor_id: string
          total_accrued?: number
          last_calculated_at?: string
          released?: boolean
          released_at?: string | null
          released_to_payout_id?: string | null
        }
        Update: {
          total_accrued?: number
          last_calculated_at?: string
          released?: boolean
          released_at?: string | null
          released_to_payout_id?: string | null
        }
        Relationships: []
      }

      alert_preferences: {
        Row: {
          id: string
          user_id: string
          alert_threshold: AlertThreshold
          alert_mentors: Json | null
          alert_pairs: Json | null
          alert_sessions: Json | null
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          push_enabled: boolean
          push_subscription: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alert_threshold?: AlertThreshold
          alert_mentors?: Json | null
          alert_pairs?: Json | null
          alert_sessions?: Json | null
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          push_enabled?: boolean
          push_subscription?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          alert_threshold?: AlertThreshold
          alert_mentors?: Json | null
          alert_pairs?: Json | null
          alert_sessions?: Json | null
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          push_enabled?: boolean
          push_subscription?: Json | null
          updated_at?: string
        }
        Relationships: []
      }

      alert_log: {
        Row: {
          id: string
          user_id: string
          mentor_id: string
          playbook_id: string
          pair: string
          grade: string
          checklist_score: number
          sent_at: string
          tapped: boolean
          tapped_at: string | null
          resulted_in_trade: boolean
          trade_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mentor_id: string
          playbook_id: string
          pair: string
          grade: string
          checklist_score: number
          sent_at?: string
          tapped?: boolean
          tapped_at?: string | null
          resulted_in_trade?: boolean
          trade_id?: string | null
        }
        Update: {
          tapped?: boolean
          tapped_at?: string | null
          resulted_in_trade?: boolean
          trade_id?: string | null
        }
        Relationships: []
      }
    }

    Views: Record<string, never>

    Functions: {
      increment_follower_count: {
        Args: Record<string, never>
        Returns: undefined
      }
      decrement_follower_count: {
        Args: Record<string, never>
        Returns: undefined
      }
    }

    Enums: {
      role: Role
      tier: Tier
      onboarding_status: OnboardingStatus
      subscription_tier: SubscriptionTier
      subscription_status: SubscriptionStatus
      event_type: EventType
      direction: Direction
      trade_outcome: TradeOutcome
      execution_source: ExecutionSource
      platform: Platform
      account_type: AccountType
      request_status: RequestStatus
      payout_status: PayoutStatus
      alert_threshold: AlertThreshold
    }
  }
}

// ─── Convenience aliases ──────────────────────────────────────────────────────

type Tables = Database['public']['Tables']

export type ProfileRow = Tables['profiles']['Row']
export type ProfileInsert = Tables['profiles']['Insert']
export type ProfileUpdate = Tables['profiles']['Update']

export type MentorRow = Tables['mentors']['Row']
export type MentorInsert = Tables['mentors']['Insert']
export type MentorUpdate = Tables['mentors']['Update']

export type PlaybookRow = Tables['playbooks']['Row']
export type PlaybookInsert = Tables['playbooks']['Insert']
export type PlaybookUpdate = Tables['playbooks']['Update']

export type SubscriptionRow = Tables['subscriptions']['Row']
export type SubscriptionInsert = Tables['subscriptions']['Insert']
export type SubscriptionUpdate = Tables['subscriptions']['Update']

export type TradeJournalRow = Tables['trade_journal']['Row']
export type TradeJournalInsert = Tables['trade_journal']['Insert']
export type TradeJournalUpdate = Tables['trade_journal']['Update']

export type TradingAccountRow = Tables['trading_accounts']['Row']
export type TradingAccountInsert = Tables['trading_accounts']['Insert']
export type TradingAccountUpdate = Tables['trading_accounts']['Update']

export type AlertPreferencesRow = Tables['alert_preferences']['Row']
export type AlertPreferencesInsert = Tables['alert_preferences']['Insert']
export type AlertPreferencesUpdate = Tables['alert_preferences']['Update']

export type AlertLogRow = Tables['alert_log']['Row']
export type AlertLogInsert = Tables['alert_log']['Insert']
export type AlertLogUpdate = Tables['alert_log']['Update']
