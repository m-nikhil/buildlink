-- Add a free text field for custom industry input
ALTER TABLE public.profiles
ADD COLUMN industry_other text;