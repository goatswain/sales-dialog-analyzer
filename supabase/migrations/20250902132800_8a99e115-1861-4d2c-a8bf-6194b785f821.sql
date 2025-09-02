-- Add foreign key constraint between group_messages and profiles
ALTER TABLE public.group_messages 
ADD CONSTRAINT fk_group_messages_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;