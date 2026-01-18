-- Add last_cursor column to daily_swipes for keyset pagination
ALTER TABLE public.daily_swipes 
ADD COLUMN last_cursor timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.daily_swipes.last_cursor IS 'Stores the created_at of the last shown profile for keyset pagination';