-- Create reactions table for group messages
CREATE TABLE public.group_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('👍', '🔥', '💡', '❓')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Enable Row Level Security
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for reactions
CREATE POLICY "Users can view reactions for groups they belong to" 
ON public.group_message_reactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = group_message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can add reactions" 
ON public.group_message_reactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_messages gm
    JOIN group_members gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = group_message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions" 
ON public.group_message_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_group_message_reactions_message_id ON public.group_message_reactions(message_id);
CREATE INDEX idx_group_message_reactions_user_id ON public.group_message_reactions(user_id);