-- Create storage policies for audio-recordings bucket
CREATE POLICY "Allow public uploads to audio-recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-recordings');

CREATE POLICY "Allow public access to audio-recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-recordings');

CREATE POLICY "Allow public updates to audio-recordings" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-recordings');

CREATE POLICY "Allow public deletes from audio-recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-recordings');