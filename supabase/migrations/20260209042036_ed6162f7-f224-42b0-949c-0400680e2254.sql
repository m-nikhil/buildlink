-- Drop the existing SELECT policy that only applies to authenticated users
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a new policy that truly allows anyone (including anon) to view profiles
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
TO anon, authenticated
USING (true);