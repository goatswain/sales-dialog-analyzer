-- Check and fix storage bucket configuration
-- First, let's see the current bucket configuration
SELECT * FROM storage.buckets WHERE id = 'audio-recordings';

-- Make sure the bucket allows proper CORS and file access
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 104857600, -- 100MB limit
  allowed_mime_types = ARRAY[
    'audio/wav', 
    'audio/mpeg', 
    'audio/mp4', 
    'audio/m4a', 
    'audio/flac', 
    'audio/ogg', 
    'audio/aac',
    'audio/webm'
  ]
WHERE id = 'audio-recordings';

-- Drop existing policies that might be conflicting  
DROP POLICY IF EXISTS "Public read access for audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;

-- Create simple, permissive policies for audio access
CREATE POLICY "Anyone can read audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-recordings');

CREATE POLICY "Authenticated users can upload to audio bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Users can manage their audio files" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'audio-recordings' AND auth.uid() IS NOT NULL);