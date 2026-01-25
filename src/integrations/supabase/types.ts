export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string | null
        }
        Insert: {
          blocked: string
          blocker: string
          created_at?: string | null
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_fkey"
            columns: ["blocked"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_fkey"
            columns: ["blocker"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          a: string
          b: string
          created_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          a: string
          b: string
          created_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          a?: string
          b?: string
          created_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friends_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          board_size: number
          code: string
          created_at: string | null
          host_id: string | null
          id: string
          pie_rule: boolean
          status: string
          turn_timer_seconds: number
          updated_at: string | null
        }
        Insert: {
          board_size?: number
          code: string
          created_at?: string | null
          host_id?: string | null
          id?: string
          pie_rule?: boolean
          status?: string
          turn_timer_seconds?: number
          updated_at?: string | null
        }
        Update: {
          board_size?: number
          code?: string
          created_at?: string | null
          host_id?: string | null
          id?: string
          pie_rule?: boolean
          status?: string
          turn_timer_seconds?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_chat_messages: {
        Row: {
          created_at: string
          id: string
          lobby_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_chat_messages_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_players: {
        Row: {
          is_ready: boolean
          last_seen: string | null
          lobby_id: string
          player_id: string
          role: string
        }
        Insert: {
          is_ready?: boolean
          last_seen?: string | null
          lobby_id: string
          player_id: string
          role?: string
        }
        Update: {
          is_ready?: boolean
          last_seen?: string | null
          lobby_id?: string
          player_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          color: number
          created_at: string | null
          is_bot: boolean
          match_id: string
          number_of_timeouts: number | null
          profile_id: string
          rating_change: number | null
        }
        Insert: {
          color: number
          created_at?: string | null
          is_bot?: boolean
          match_id: string
          number_of_timeouts?: number | null
          profile_id: string
          rating_change?: number | null
        }
        Update: {
          color?: number
          created_at?: string | null
          is_bot?: boolean
          match_id?: string
          number_of_timeouts?: number | null
          profile_id?: string
          rating_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_difficulty: Database["public"]["Enums"]["ai_difficulty"] | null
          allow_spectators: boolean
          created_at: string | null
          id: string
          is_ranked: boolean | null
          lobby_id: string | null
          owner: string | null
          pie_rule: boolean
          size: number
          status: Database["public"]["Enums"]["match_status"]
          timeout_limit: number | null
          tournament_id: string | null
          turn: number
          turn_started_at: string | null
          turn_timer_seconds: number | null
          updated_at: string | null
          version: number
          winner: number | null
        }
        Insert: {
          ai_difficulty?: Database["public"]["Enums"]["ai_difficulty"] | null
          allow_spectators?: boolean
          created_at?: string | null
          id?: string
          is_ranked?: boolean | null
          lobby_id?: string | null
          owner?: string | null
          pie_rule?: boolean
          size: number
          status?: Database["public"]["Enums"]["match_status"]
          timeout_limit?: number | null
          tournament_id?: string | null
          turn?: number
          turn_started_at?: string | null
          turn_timer_seconds?: number | null
          updated_at?: string | null
          version?: number
          winner?: number | null
        }
        Update: {
          ai_difficulty?: Database["public"]["Enums"]["ai_difficulty"] | null
          allow_spectators?: boolean
          created_at?: string | null
          id?: string
          is_ranked?: boolean | null
          lobby_id?: string | null
          owner?: string | null
          pie_rule?: boolean
          size?: number
          status?: Database["public"]["Enums"]["match_status"]
          timeout_limit?: number | null
          tournament_id?: string | null
          turn?: number
          turn_started_at?: string | null
          turn_timer_seconds?: number | null
          updated_at?: string | null
          version?: number
          winner?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      move_rate_limits: {
        Row: {
          last_move_at: string
          match_id: string
          move_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          last_move_at?: string
          match_id: string
          move_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          last_move_at?: string
          match_id?: string
          move_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "move_rate_limits_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      moves: {
        Row: {
          action_id: string | null
          cell: number | null
          color: number
          created_at: string | null
          match_id: string
          ply: number
        }
        Insert: {
          action_id?: string | null
          cell?: number | null
          color: number
          created_at?: string | null
          match_id: string
          ply: number
        }
        Update: {
          action_id?: string | null
          cell?: number | null
          color?: number
          created_at?: string | null
          match_id?: string
          ply?: number
        }
        Relationships: [
          {
            foreignKeyName: "moves_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          receiver_id: string
          sender_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          receiver_id: string
          sender_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          receiver_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          bio: string | null
          board_skin: string | null
          converted_from_anonymous_id: string | null
          created_at: string | null
          discord_id: string | null
          discord_username: string | null
          elo_rating: number | null
          games_rated: number | null
          id: string
          is_guest: boolean | null
          is_premium: boolean | null
          last_daily_puzzle_date: string | null
          last_online: string | null
          premium_expires_at: string | null
          puzzle_streak: number | null
          puzzle_streak_best: number | null
          rating_deviation: number | null
          username: string
        }
        Insert: {
          avatar_color?: string | null
          bio?: string | null
          board_skin?: string | null
          converted_from_anonymous_id?: string | null
          created_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          elo_rating?: number | null
          games_rated?: number | null
          id: string
          is_guest?: boolean | null
          is_premium?: boolean | null
          last_daily_puzzle_date?: string | null
          last_online?: string | null
          premium_expires_at?: string | null
          puzzle_streak?: number | null
          puzzle_streak_best?: number | null
          rating_deviation?: number | null
          username: string
        }
        Update: {
          avatar_color?: string | null
          bio?: string | null
          board_skin?: string | null
          converted_from_anonymous_id?: string | null
          created_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          elo_rating?: number | null
          games_rated?: number | null
          id?: string
          is_guest?: boolean | null
          is_premium?: boolean | null
          last_daily_puzzle_date?: string | null
          last_online?: string | null
          premium_expires_at?: string | null
          puzzle_streak?: number | null
          puzzle_streak_best?: number | null
          rating_deviation?: number | null
          username?: string
        }
        Relationships: []
      }
      puzzle_rush_scores: {
        Row: {
          created_at: string
          id: string
          puzzles_solved: number
          score: number
          time_limit_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          puzzles_solved?: number
          score?: number
          time_limit_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          puzzles_solved?: number
          score?: number
          time_limit_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_rush_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      puzzles: {
        Row: {
          board_size: number
          category: string
          created_at: string
          daily_date: string | null
          description: string | null
          difficulty: string
          id: string
          is_daily: boolean
          rating: number
          setup_moves: Json
          solution_moves: Json
          times_played: number
          times_solved: number
          title: string
        }
        Insert: {
          board_size?: number
          category?: string
          created_at?: string
          daily_date?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_daily?: boolean
          rating?: number
          setup_moves?: Json
          solution_moves?: Json
          times_played?: number
          times_solved?: number
          title: string
        }
        Update: {
          board_size?: number
          category?: string
          created_at?: string
          daily_date?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          is_daily?: boolean
          rating?: number
          setup_moves?: Json
          solution_moves?: Json
          times_played?: number
          times_solved?: number
          title?: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          new_rating: number
          old_rating: number
          profile_id: string
          rating_change: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          new_rating: number
          old_rating: number
          profile_id: string
          rating_change: number
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          new_rating?: number
          old_rating?: number
          profile_id?: string
          rating_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rematch_requests: {
        Row: {
          created_at: string
          id: string
          lobby_id: string | null
          match_id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id?: string | null
          match_id: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string | null
          match_id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rematch_requests_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rematch_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rematch_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rematch_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spectators: {
        Row: {
          joined_at: string
          match_id: string
          profile_id: string
        }
        Insert: {
          joined_at?: string
          match_id: string
          profile_id: string
        }
        Update: {
          joined_at?: string
          match_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spectators_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          bracket_position: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          match_id: string | null
          next_match_id: string | null
          player1_id: string | null
          player2_id: string | null
          round_id: string | null
          status: string
          tournament_id: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          round_id?: string | null
          status?: string
          tournament_id?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          round_id?: string | null
          status?: string
          tournament_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tournament_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          joined_at: string | null
          losses: number | null
          player_id: string
          points: number | null
          seed: number | null
          status: string
          tournament_id: string
          wins: number | null
        }
        Insert: {
          joined_at?: string | null
          losses?: number | null
          player_id: string
          points?: number | null
          seed?: number | null
          status?: string
          tournament_id: string
          wins?: number | null
        }
        Update: {
          joined_at?: string | null
          losses?: number | null
          player_id?: string
          points?: number | null
          seed?: number | null
          status?: string
          tournament_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_rounds: {
        Row: {
          completed_at: string | null
          id: string
          round_name: string | null
          round_number: number
          started_at: string | null
          status: string
          tournament_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          round_name?: string | null
          round_number: number
          started_at?: string | null
          status?: string
          tournament_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          round_name?: string | null
          round_number?: number
          started_at?: string | null
          status?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          board_size: number
          created_at: string | null
          created_by: string | null
          description: string | null
          format: string
          id: string
          max_players: number
          min_players: number
          name: string
          pie_rule: boolean
          registration_deadline: string | null
          start_time: string | null
          status: string
          turn_timer_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          board_size?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          format?: string
          id?: string
          max_players?: number
          min_players?: number
          name: string
          pie_rule?: boolean
          registration_deadline?: string | null
          start_time?: string | null
          status?: string
          turn_timer_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          board_size?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          format?: string
          id?: string
          max_players?: number
          min_players?: number
          name?: string
          pie_rule?: boolean
          registration_deadline?: string | null
          start_time?: string | null
          status?: string
          turn_timer_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_progress: {
        Row: {
          completed_at: string | null
          profile_id: string
          step: number
        }
        Insert: {
          completed_at?: string | null
          profile_id: string
          step: number
        }
        Update: {
          completed_at?: string | null
          profile_id?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_puzzles: {
        Row: {
          completed: boolean
          puzzle_date: string
          puzzle_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          puzzle_date?: string
          puzzle_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          puzzle_date?: string
          puzzle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_puzzles_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_puzzles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          match_id: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          match_id?: string | null
          profile_id: string
          status: string
          updated_at?: string
        }
        Update: {
          match_id?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_puzzle_attempts: {
        Row: {
          attempts: number
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          puzzle_id: string
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          attempts?: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          puzzle_id: string
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          attempts?: number
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          puzzle_id?: string
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "puzzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_puzzle_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_stats: {
        Row: {
          avg_game_length_minutes: number | null
          favorite_board_size: number | null
          last_played_at: string | null
          losses: number | null
          profile_id: string | null
          total_games: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_friends: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_move_rate_limit: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      find_lobby_by_code: { Args: { lobby_code: string }; Returns: string }
      find_match_by_code: { Args: { code: string }; Returns: string }
      generate_lobby_code: { Args: never; Returns: string }
      generate_match_code: { Args: { match_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_anonymous_user: { Args: { _user_id: string }; Returns: boolean }
      is_blocked: {
        Args: { _blocked: string; _blocker: string }
        Returns: boolean
      }
      user_in_lobby: {
        Args: { _lobby_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_difficulty: "easy" | "medium" | "hard" | "expert"
      app_role: "admin" | "moderator" | "user"
      match_status: "waiting" | "active" | "finished" | "aborted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_difficulty: ["easy", "medium", "hard", "expert"],
      app_role: ["admin", "moderator", "user"],
      match_status: ["waiting", "active", "finished", "aborted"],
    },
  },
} as const
