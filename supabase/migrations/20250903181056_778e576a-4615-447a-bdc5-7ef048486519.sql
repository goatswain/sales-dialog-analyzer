-- Temporarily disable the sanitize trigger on recordings table
DROP TRIGGER IF EXISTS sanitize_recordings_input ON public.recordings;

-- Let's also check what triggers actually exist on the recordings table
SELECT t.trigger_name, t.event_manipulation, t.action_timing 
FROM information_schema.triggers t
WHERE t.event_object_table = 'recordings';