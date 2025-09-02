-- Add display_name to profiles table for better user identification
ALTER TABLE public.profiles 
ADD COLUMN display_name TEXT;

-- Update group_messages table to support recording shares
ALTER TABLE public.group_messages 
ADD COLUMN audio_url TEXT,
ADD COLUMN duration_seconds INTEGER,
ADD COLUMN parent_message_id UUID REFERENCES public.group_messages(id);

-- Create index for parent message relationships (for threaded replies later)
CREATE INDEX idx_group_messages_parent ON public.group_messages(parent_message_id);

-- Update groups table to track last activity
ALTER TABLE public.groups 
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();