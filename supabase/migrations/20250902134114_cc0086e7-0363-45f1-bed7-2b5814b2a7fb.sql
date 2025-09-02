-- Allow group members to view transcripts for recordings shared in their groups
CREATE POLICY "Group members can view shared recording transcripts"
ON public.transcripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    INNER JOIN public.group_members gmem ON gm.group_id = gmem.group_id
    WHERE gm.recording_id = transcripts.recording_id
    AND gmem.user_id = auth.uid()
  )
);

-- Allow group creators to update group names
CREATE POLICY "Group creators can update group names"
ON public.groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = auth.uid()
    AND gm.role = 'creator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = auth.uid()
    AND gm.role = 'creator'
  )
);