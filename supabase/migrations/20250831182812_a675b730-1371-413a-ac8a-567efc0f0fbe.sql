-- Enable real-time updates for recordings and transcripts tables
ALTER TABLE public.recordings REPLICA IDENTITY FULL;
ALTER TABLE public.transcripts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;