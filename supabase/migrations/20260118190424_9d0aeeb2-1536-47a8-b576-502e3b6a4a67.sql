-- Add DELETE policy for dismissed_profiles so users can undo dismissals
CREATE POLICY "Users can delete their own dismissed profiles"
ON public.dismissed_profiles
FOR DELETE
USING (auth.uid() IN (
  SELECT profiles.user_id
  FROM profiles
  WHERE profiles.id = dismissed_profiles.user_id
));