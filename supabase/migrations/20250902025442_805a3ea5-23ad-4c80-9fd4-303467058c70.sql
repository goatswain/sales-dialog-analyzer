-- Phase 3: Final security cleanup

-- Fix remaining function search path issues for debug functions
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.test_auth_context()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'session_user', session_user
  );
$$;

-- Clean up any orphaned data in other tables
DELETE FROM public.transcripts WHERE user_id IS NULL;
DELETE FROM public.conversation_notes WHERE user_id IS NULL;

-- Make sure all user_id columns are NOT NULL where they should be
ALTER TABLE public.transcripts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.conversation_notes ALTER COLUMN user_id SET NOT NULL;

-- Add indexes for better performance on security-sensitive queries
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_user_id ON public.conversation_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);