-- Check if the audio-recordings bucket exists and is properly configured
SELECT * FROM storage.buckets WHERE id = 'audio-recordings';

-- Check current storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'audio-recordings';