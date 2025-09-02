-- Phase 1: Critical Database Security Fixes

-- 1. Enable RLS on groups table (if not already enabled)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 2. Create proper RLS policies for groups table
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- 3. Fix orphaned recordings by deleting them (they have no owner)
DELETE FROM public.recordings WHERE user_id IS NULL;

-- 4. Make user_id NOT NULL for recordings table to prevent future orphaned records
ALTER TABLE public.recordings ALTER COLUMN user_id SET NOT NULL;

-- 5. Fix database function security issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_audio_upload(file_name text, file_size integer, content_type text)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate file extension
  IF NOT (file_name ~* '\.(mp3|wav|m4a|flac|ogg|aac)$') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate content type
  IF NOT (content_type IN ('audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/aac')) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate file size (max 100MB)
  IF file_size > 104857600 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;