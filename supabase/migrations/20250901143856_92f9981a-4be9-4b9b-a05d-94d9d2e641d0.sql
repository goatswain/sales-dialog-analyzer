-- Drop the overly permissive UPDATE policy
DROP POLICY "update_own_subscription" ON public.subscribers;

-- Create a secure UPDATE policy that only allows users to update their own records
CREATE POLICY "users_can_update_own_subscription" ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also improve the INSERT policy to be more restrictive
DROP POLICY "insert_subscription" ON public.subscribers;

CREATE POLICY "users_can_insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (auth.uid() = user_id);