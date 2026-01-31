-- Add a free text field for "what looking for" description
ALTER TABLE public.profiles
ADD COLUMN looking_for_text text;