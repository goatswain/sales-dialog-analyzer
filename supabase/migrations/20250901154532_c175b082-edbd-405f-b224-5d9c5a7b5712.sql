-- Add missing DELETE policy for profiles table to complete RLS protection
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add comprehensive input validation function for file uploads
CREATE OR REPLACE FUNCTION public.validate_audio_upload(
  file_name TEXT,
  file_size INTEGER,
  content_type TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;