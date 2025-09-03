-- Update the audio-recordings bucket to allow CORS
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/flac', 'audio/ogg', 'audio/aac']
WHERE id = 'audio-recordings';

-- Ensure the bucket is public  
UPDATE storage.buckets 
SET public = true
WHERE id = 'audio-recordings';