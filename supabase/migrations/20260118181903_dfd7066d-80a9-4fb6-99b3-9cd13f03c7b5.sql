-- Allow users to delete connections they're part of
CREATE POLICY "Users can delete connections they're part of"
ON public.connections
FOR DELETE
USING (
  requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);