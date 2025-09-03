-- Add system message support to group_messages
ALTER TABLE public.group_messages ADD COLUMN system_message boolean DEFAULT false;

-- Add notification preferences table
CREATE TABLE public.group_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL,
  muted_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS for notification preferences
ALTER TABLE public.group_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.group_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
ON public.group_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.group_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
ON public.group_notification_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for notification preferences updated_at
CREATE TRIGGER update_group_notification_preferences_updated_at
BEFORE UPDATE ON public.group_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update group_messages to allow system messages without requiring user_id
ALTER TABLE public.group_messages ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id is present OR it's a system message
ALTER TABLE public.group_messages ADD CONSTRAINT group_messages_user_or_system
CHECK (
  (user_id IS NOT NULL AND system_message = false) OR 
  (user_id IS NULL AND system_message = true)
);

-- Update RLS policy for system messages
DROP POLICY IF EXISTS "Group members can create messages" ON public.group_messages;
CREATE POLICY "Group members can create messages"
ON public.group_messages
FOR INSERT
WITH CHECK (
  is_group_member(group_id, auth.uid()) AND 
  (
    (user_id = auth.uid() AND system_message = false) OR
    (user_id IS NULL AND system_message = true)
  )
);