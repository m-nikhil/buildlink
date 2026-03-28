export type GroupVisibility = 'public' | 'private';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  owner_id: string;
  invite_code: string;
  approval_required: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

export interface UserAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface GroupTimeslot {
  id: string;
  group_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  label: string | null;
  created_at: string;
}

export interface TimeslotSubscription {
  id: string;
  timeslot_id: string;
  user_id: string;
  created_at: string;
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface TimeslotConfirmation {
  id: string;
  timeslot_id: string;
  user_id: string;
  week_of: string; // YYYY-MM-DD (Monday of the week)
  confirmed_at: string;
}

export interface GroupMatch {
  id: string;
  group_id: string;
  timeslot_id: string;
  user_a_id: string;
  user_b_id: string;
  week_of: string;
  match_reason: string | null;
  video_call_url: string | null;
  status: 'scheduled' | 'completed' | 'skipped';
  created_at: string;
}

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'UTC',
];

export const MAX_GROUPS_PER_USER = 5;
export const MAX_TIMESLOTS_PER_GROUP = 3;
export const TIMESLOT_DURATION_MINUTES = 30;

// Confirmation window: opens 3 days before, closes 1 day before
export const CONFIRM_WINDOW_OPEN_DAYS = 3;
export const CONFIRM_WINDOW_CLOSE_DAYS = 1;

// Get the Monday of a given date's week
export function getWeekOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Get the next occurrence of a day_of_week from today
export function getNextOccurrence(dayOfWeek: number): Date {
  const now = new Date();
  const today = now.getDay();
  let daysUntil = dayOfWeek - today;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

// How many days until the next occurrence of this timeslot
export function daysUntilTimeslot(dayOfWeek: number): number {
  const now = new Date();
  const today = now.getDay();
  let daysUntil = dayOfWeek - today;
  if (daysUntil <= 0) daysUntil += 7;
  return daysUntil;
}

// Is the confirmation window open for this timeslot?
export function isConfirmWindowOpen(dayOfWeek: number): boolean {
  const days = daysUntilTimeslot(dayOfWeek);
  return days <= CONFIRM_WINDOW_OPEN_DAYS && days > CONFIRM_WINDOW_CLOSE_DAYS;
}

// Has the confirmation window closed (matching happens)?
export function isConfirmWindowClosed(dayOfWeek: number): boolean {
  const days = daysUntilTimeslot(dayOfWeek);
  return days <= CONFIRM_WINDOW_CLOSE_DAYS;
}
