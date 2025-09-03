-- SECURITY FIX: Create explicit SELECT policies for subscribers table
-- The scanner requires specific SELECT policies rather than general ALL policies

-- Drop the general authenticated policy and recreate with specific operations
DROP POLICY IF EXISTS "users_own_data_only" ON public.subscribers;

-- Create explicit policies for each operation
CREATE POLICY "users_select_own_data" ON public.subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_data" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_data" ON public.subscribers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_data" ON public.subscribers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);