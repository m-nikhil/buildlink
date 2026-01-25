export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type ConnectionGoal = 'mentorship' | 'collaboration' | 'networking' | 'hiring' | 'job_seeking';
export type Industry = 'tech' | 'finance' | 'healthcare' | 'education' | 'marketing' | 'consulting' | 'other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  experience_level: ExperienceLevel | null;
  industry: Industry | null;
  looking_for: ConnectionGoal[] | null;
  skills: string[] | null;
  location: string | null;
  // Match preferences
  preferred_experience_levels: ExperienceLevel[] | null;
  preferred_industries: Industry[] | null;
  preferred_goals: ConnectionGoal[] | null;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  requester_linkedin_requested: boolean | null;
  recipient_linkedin_requested: boolean | null;
  created_at: string;
  updated_at: string;
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  executive: 'Executive',
};

export const GOAL_LABELS: Record<ConnectionGoal, string> = {
  mentorship: 'Mentorship',
  collaboration: 'Collaboration',
  networking: 'Networking',
  hiring: 'Hiring',
  job_seeking: 'Job Seeking',
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  tech: 'Technology',
  finance: 'Finance',
  healthcare: 'Healthcare',
  education: 'Education',
  marketing: 'Marketing',
  consulting: 'Consulting',
  other: 'Other',
};
