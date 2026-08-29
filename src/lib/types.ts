// Handgeschreven spiegel van supabase/schema.sql (1-op-1, zie SCHEMA.md).
// `Relationships`/`Views`/`Functions` zijn verplicht voor structurele compatibiliteit
// met @supabase/postgrest-js' GenericSchema (zie SupabaseClient.ts) — we gebruiken
// zelf geen embedded relaties of database-functies, dus die blijven leeg.

export type TaskKey = "extra_water" | "extra_magnesium_food" | "extra_b_complex";

export type Sex = "male" | "female";

export type RecurrenceType = "daily" | "every_n_days" | "weekly";

export type Unit = "g" | "ml";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          weight_kg: number | null;
          height_cm: number | null;
          sex: Sex | null;
          birth_date: string | null;
          activity_level: string | null;
          goal: string | null;
          goal_pace_kg_per_week: number | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          sex?: Sex | null;
          birth_date?: string | null;
          activity_level?: string | null;
          goal?: string | null;
          goal_pace_kg_per_week?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          sex?: Sex | null;
          birth_date?: string | null;
          activity_level?: string | null;
          goal?: string | null;
          goal_pace_kg_per_week?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_targets: {
        Row: {
          user_id: string;
          calories_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          water_ml: number;
          alcohol_extra_water_ml: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          calories_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          water_ml: number;
          alcohol_extra_water_ml?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          calories_kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
          water_ml?: number;
          alcohol_extra_water_ml?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          barcode: string | null;
          image_url: string | null;
          calories_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          reference_grams: number;
          unit: Unit;
          serving_size: number | null;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          barcode?: string | null;
          image_url?: string | null;
          calories_kcal: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
          reference_grams?: number;
          unit?: Unit;
          serving_size?: number | null;
          is_favorite?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          barcode?: string | null;
          image_url?: string | null;
          calories_kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
          reference_grams?: number;
          unit?: Unit;
          serving_size?: number | null;
          is_favorite?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_item_id: string | null;
          recipe_id: string | null;
          name: string;
          image_url: string | null;
          ingredient_count: number | null;
          calories_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          log_date: string;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_item_id?: string | null;
          recipe_id?: string | null;
          name: string;
          image_url?: string | null;
          ingredient_count?: number | null;
          calories_kcal: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
          log_date: string;
          logged_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          food_item_id?: string | null;
          recipe_id?: string | null;
          name?: string;
          image_url?: string | null;
          ingredient_count?: number | null;
          calories_kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
          log_date?: string;
          logged_at?: string;
        };
        Relationships: [];
      };
      supplements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          intake_time: string;
          recurrence_type: RecurrenceType;
          recurrence_n: number | null;
          recurrence_weekday: number | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          intake_time?: string;
          recurrence_type?: RecurrenceType;
          recurrence_n?: number | null;
          recurrence_weekday?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          intake_time?: string;
          recurrence_type?: RecurrenceType;
          recurrence_n?: number | null;
          recurrence_weekday?: number | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      supplement_reminders: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          slot: number;
          offset_minutes: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          slot: number;
          offset_minutes?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          supplement_id?: string;
          slot?: number;
          offset_minutes?: number;
        };
        Relationships: [];
      };
      supplement_logs: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          log_date: string;
          checked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          log_date: string;
          checked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          supplement_id?: string;
          log_date?: string;
          checked_at?: string;
        };
        Relationships: [];
      };
      correction_checkoffs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          task_key: TaskKey;
          checked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          task_key: TaskKey;
          checked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          task_key?: TaskKey;
          checked_at?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          log_date: string;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          log_date: string;
          logged_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_ml?: number;
          log_date?: string;
          logged_at?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          log_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          log_date: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight_kg?: number;
          log_date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      alcohol_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          name: string;
          image_url: string | null;
          grams: number;
          calories_kcal_per_100g: number;
          protein_g_per_100g: number;
          carbs_g_per_100g: number;
          fat_g_per_100g: number;
          fiber_g_per_100g: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          name: string;
          image_url?: string | null;
          grams: number;
          calories_kcal_per_100g: number;
          protein_g_per_100g?: number;
          carbs_g_per_100g?: number;
          fat_g_per_100g?: number;
          fiber_g_per_100g?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipe_id?: string;
          name?: string;
          image_url?: string | null;
          grams?: number;
          calories_kcal_per_100g?: number;
          protein_g_per_100g?: number;
          carbs_g_per_100g?: number;
          fat_g_per_100g?: number;
          fiber_g_per_100g?: number;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sent_reminder_notifications: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          slot: number;
          log_date: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          slot: number;
          log_date: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          supplement_id?: string;
          slot?: number;
          log_date?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicTables = Database["public"]["Tables"];

export type Profile = PublicTables["profiles"]["Row"];
export type DailyTargets = PublicTables["daily_targets"]["Row"];
export type FoodItem = PublicTables["food_items"]["Row"];
export type FoodLog = PublicTables["food_logs"]["Row"];
export type Supplement = PublicTables["supplements"]["Row"];
export type SupplementReminder = PublicTables["supplement_reminders"]["Row"];
export type SupplementLog = PublicTables["supplement_logs"]["Row"];
export type CorrectionCheckoff = PublicTables["correction_checkoffs"]["Row"];
export type WaterLog = PublicTables["water_logs"]["Row"];
export type WeightLog = PublicTables["weight_logs"]["Row"];
export type AlcoholLog = PublicTables["alcohol_logs"]["Row"];
export type Recipe = PublicTables["recipes"]["Row"];
export type RecipeIngredient = PublicTables["recipe_ingredients"]["Row"];
export type PushSubscriptionRow = PublicTables["push_subscriptions"]["Row"];
