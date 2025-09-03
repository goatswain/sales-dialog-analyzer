-- Create proper storage policies for the audio-recordings bucket
-- Allow public read access to audio files
CREATE POLICY "Public read access for audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-recordings');

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'audio-recordings' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own audio files
CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'audio-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'audio-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);