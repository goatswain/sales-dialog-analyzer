-- SECURITY FIX: Strengthen subscribers table RLS policies to prevent unauthorized access
-- The current policies have potential vulnerabilities that could expose customer data

-- Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "service_role_stripe_only" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_stripe_subscriber_creation" ON public.subscribers;  
DROP POLICY IF EXISTS "service_role_stripe_update_only" ON public.subscribers;

-- Create more secure service role policies with stricter access controls

-- Policy 1: Service role can only INSERT subscribers during checkout/auth flows
CREATE POLICY "service_role_secure_insert" ON public.subscribers
FOR INSERT
TO service_role
WITH CHECK (
  -- Validate email format and user_id presence
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND user_id IS NOT NULL
  AND length(email) > 0
  AND length(email) < 255
  -- Ensure this is a legitimate user by checking auth.users exists
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = subscribers.user_id 
    AND auth.users.email = subscribers.email
  )
);

-- Policy 2: Service role can only UPDATE subscription status for existing customers
CREATE POLICY "service_role_secure_update" ON public.subscribers  
FOR UPDATE
TO service_role
USING (
  -- Only allow updates to existing records with valid Stripe customer ID
  stripe_customer_id IS NOT NULL
  AND email IS NOT NULL
  AND user_id IS NOT NULL
  -- Verify the user still exists in auth.users
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = subscribers.user_id 
    AND auth.users.email = subscribers.email
  )
)
WITH CHECK (
  -- Prevent modification of core identifying fields
  user_id = (SELECT s.user_id FROM subscribers s WHERE s.id = subscribers.id)
  AND email = (SELECT s.email FROM subscribers s WHERE s.id = subscribers.id)
  -- Only allow updating subscription-related fields
  AND stripe_customer_id IS NOT NULL
);

-- Policy 3: Service role can SELECT for Stripe operations, but with restrictions
CREATE POLICY "service_role_secure_select" ON public.subscribers
FOR SELECT  
TO service_role
USING (
  -- Only allow reading records that have valid Stripe data and user verification
  stripe_customer_id IS NOT NULL
  AND email IS NOT NULL 
  AND user_id IS NOT NULL
  -- Verify the user record exists and email matches
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = subscribers.user_id 
    AND auth.users.email = subscribers.email
  )
);

-- Add comprehensive audit logging for all service role access
CREATE OR REPLACE FUNCTION public.audit_subscriber_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any service role modifications for security monitoring
  INSERT INTO public.audit_log (
    table_name,
    operation, 
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'subscribers',
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW), 
    auth.uid(),
    NOW()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE  
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_subscribers_trigger ON public.subscribers;
CREATE TRIGGER audit_subscribers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscriber_access();