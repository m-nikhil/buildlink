// Firestore profile document type - flexible schema
export interface FirestoreProfile {
  id: string; // matches Supabase profile ID
  user_id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  linkedin_url?: string;
  location?: string;
  age?: number;
  
  // Indexed fields for filtering
  experience_level?: string;
  industry?: string;
  looking_for?: string[];
  skills?: string[];
  
  // Preference fields
  preferred_experience_levels?: string[];
  preferred_industries?: string[];
  preferred_goals?: string[];
  age_min?: number;
  age_max?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Flexible additional fields
  [key: string]: unknown;
}

export interface ProfileFilters {
  experience_level?: string;
  industry?: string;
  looking_for?: string;
  skills?: string[];
  location?: string;
  age_min?: number;
  age_max?: number;
}

export interface PaginationCursor {
  lastDoc?: string; // created_at timestamp for keyset pagination
}
