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

// Connection document type
export interface FirestoreConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted';
  message: string | null;
  requester_linkedin_requested: boolean;
  recipient_linkedin_requested: boolean;
  created_at: string;
  updated_at: string;
}

// Message document type
export interface FirestoreMessage {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Daily swipes document type
export interface FirestoreDailySwipe {
  id: string; // Format: {user_id}_{date}
  user_id: string;
  swipe_date: string; // YYYY-MM-DD
  swipe_count: number;
  last_cursor: string | null;
  created_at: string;
  updated_at: string;
}

// Dismissed profile document type
export interface FirestoreDismissedProfile {
  id: string; // Format: {user_id}_{dismissed_profile_id}
  user_id: string;
  dismissed_profile_id: string;
  dismiss_count: number;
  last_dismissed_at: string;
  created_at: string;
}
