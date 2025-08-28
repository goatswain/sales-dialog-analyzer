-- Create the audio-recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-recordings', 'audio-recordings', true)
ON CONFLICT (id) DO NOTHING;