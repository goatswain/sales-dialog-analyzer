import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthGuard';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Search, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  member_count: number;
  last_activity_at: string;
}

interface Recording {
  id: string;
  title: string;
  duration_seconds?: number;
  audio_url?: string;
}

interface SendToGroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
}

const SendToGroupDrawer: React.FC<SendToGroupDrawerProps> = ({
  open,
  onOpenChange,
  recording
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserGroups();
    }
  }, [open, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredGroups(
        groups.filter(group => 
          group.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredGroups(groups);
    }
  }, [searchQuery, groups]);

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name,
            last_activity_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        data.map(async (item) => {
          const group = item.groups;
          if (!group) return null;

          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            id: group.id,
            name: group.name,
            member_count: count || 0,
            last_activity_at: group.last_activity_at
          };
        })
      );

      setGroups(groupsWithCounts.filter(Boolean) as Group[]);
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

  const shareRecording = async (groupId: string, groupName: string) => {
    if (!recording || !user || !recording.audio_url) return;

    setSharing(true);
    try {
      // Create the group message with recording data
      const { error: messageError } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          message_type: 'recording_share',
          content: `Shared recording: ${recording.title}`,
          audio_url: recording.audio_url,
          duration_seconds: recording.duration_seconds
        });

      if (messageError) throw messageError;

      // Update group's last activity
      const { error: groupError } = await supabase
        .from('groups')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', groupId);

      if (groupError) throw groupError;

      toast({
        title: 'Shared Successfully',
        description: `Recording shared to ${groupName}`,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate(`/groups/${groupId}`);
            }}
          >
            View in chat
          </Button>
        )
      });

      onOpenChange(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: 'Share Failed',
        description: 'Failed to share recording. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Send to Group</DrawerTitle>
          {recording && (
            <p className="text-sm text-muted-foreground">
              {recording.title} • {formatDuration(recording.duration_seconds)}
            </p>
          )}
        </DrawerHeader>

        <div className="px-4 pb-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading groups...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {groups.length === 0 ? "No groups yet" : "No matching groups"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {groups.length === 0 
                    ? "Create or join a group to start sharing recordings"
                    : "Try a different search term"
                  }
                </p>
                {groups.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/groups');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <Card 
                    key={group.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => shareRecording(group.id, group.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{group.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                            </span>
                            <span>
                              {formatLastActivity(group.last_activity_at)}
                            </span>
                          </div>
                        </div>
                        {sharing && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate('/groups');
            }}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Group
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default SendToGroupDrawer;