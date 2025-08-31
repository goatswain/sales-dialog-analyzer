-- Enable real-time updates for transcripts table if not already done
ALTER TABLE public.transcripts REPLICA IDENTITY FULL;

-- Try to add transcripts table to realtime publication (ignore if already exists)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;
EXCEPTION
  WHEN duplicate_object THEN 
    NULL; -- Ignore if already exists
END $$;