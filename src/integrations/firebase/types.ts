import { ExperienceLevel, Industry, ConnectionGoal } from '@/types/profile';

// Firestore profile document type - flexible schema
export interface FirestoreProfile {
  id: string; // matches auth user ID
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  location: string | null;
  age: number | null;
  
  // Indexed fields for filtering
  experience_level: ExperienceLevel | null;
  industry: Industry | null;
  looking_for: ConnectionGoal[];
  skills: string[];
  
  // Preference fields
  preferred_experience_levels: ExperienceLevel[];
  preferred_industries: Industry[];
  preferred_goals: ConnectionGoal[];
  age_min: number | null;
  age_max: number | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ProfileFilters {
  experience_level?: ExperienceLevel;
  industry?: Industry;
  looking_for?: ConnectionGoal;
  skills?: string[];
  location?: string;
  age_min?: number;
  age_max?: number;
}

export interface PaginationCursor {
  lastDoc?: string; // created_at timestamp for keyset pagination
}
