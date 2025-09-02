import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthGuard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Share } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
}

interface ShareRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  recordingTitle: string;
}

const ShareRecordingDialog: React.FC<ShareRecordingDialogProps> = ({
  open,
  onOpenChange,
  recordingId,
  recordingTitle
}) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserGroups();
    }
  }, [open, user]);

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const userGroups = data.map(item => item.groups).filter(Boolean);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your groups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const shareRecording = async () => {
    if (!selectedGroupId) return;

    setSharing(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroupId,
          user_id: user?.id,
          message_type: 'recording',
          recording_id: recordingId,
          content: `Shared recording: ${recordingTitle}`
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Recording shared with the group'
      });

      onOpenChange(false);
      setSelectedGroupId('');
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to share recording',
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Recording
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Recording</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="font-medium">{recordingTitle}</p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                You're not in any groups yet
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  // Navigate to groups page - you might want to use navigate here
                  window.location.href = '/groups';
                }}
              >
                Create or Join a Group
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Select Group
                </label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={shareRecording}
                  disabled={!selectedGroupId || sharing}
                >
                  {sharing ? 'Sharing...' : 'Share Recording'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecordingDialog;