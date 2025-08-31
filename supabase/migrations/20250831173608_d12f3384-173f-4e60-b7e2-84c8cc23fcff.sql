-- Enable real-time on transcripts table
ALTER TABLE public.transcripts REPLICA IDENTITY FULL;

-- Add transcripts to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;

-- Also ensure recordings table has real-time enabled
ALTER TABLE public.recordings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recordings;