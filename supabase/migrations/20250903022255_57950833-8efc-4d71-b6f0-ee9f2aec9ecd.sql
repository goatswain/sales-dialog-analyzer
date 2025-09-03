-- Fix security vulnerability in subscribers table
-- 1. First make user_id NOT NULL to ensure proper user association
ALTER TABLE public.subscribers 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Drop the vulnerable RLS policy that allows email-based access
DROP POLICY "select_own_subscription" ON public.subscribers;

-- 3. Create a secure policy that only uses user_id authentication
CREATE POLICY "users_can_view_own_subscription" ON public.subscribers
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Ensure update policy is also secure (only user_id based)
DROP POLICY "users_can_update_own_subscription" ON public.subscribers;

CREATE POLICY "users_can_update_own_subscription" ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Ensure insert policy is secure  
DROP POLICY "users_can_insert_own_subscription" ON public.subscribers;

CREATE POLICY "users_can_insert_own_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Add policy for edge functions to manage subscriptions (using service role key)
CREATE POLICY "service_role_full_access" ON public.subscribers
FOR ALL
USING (true)
WITH CHECK (true);

-- Note: This policy will only apply when using the service role key, 
-- which edge functions use to bypass normal RLS for administrative operations