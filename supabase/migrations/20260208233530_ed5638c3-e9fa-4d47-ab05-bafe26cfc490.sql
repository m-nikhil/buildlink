-- Add password column to weekly_intros table for video call security
ALTER TABLE public.weekly_intros 
ADD COLUMN video_call_password text;