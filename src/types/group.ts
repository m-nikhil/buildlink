export type GroupVisibility = 'public' | 'private';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  visibility: GroupVisibility;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
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

export const MAX_GROUPS_PER_USER = 5;
export const MAX_TIMESLOTS_PER_GROUP = 10;
