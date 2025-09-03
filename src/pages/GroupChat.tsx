import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthGuard';
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { GroupAISummary } from "@/components/GroupAISummary"
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Plus, 
  Mail, 
  Settings,
  Mic,
  Play,
  Pause,
  Clock,
  Edit3,
  MoreVertical,
  LogOut,
  Trash2,
  Bell,
  BellOff,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';

interface Group {
  id: string;
  name: string;
  creator_id: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Message {
  id: string;
  user_id: string | null;
  message_type: string;
  content: string;
  created_at: string;
  recording_id: string | null;
  audio_url?: string;
  duration_seconds?: number;
  system_message?: boolean;
  profiles: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
  recordings?: {
    title: string;
    audio_url: string;
    duration_seconds: number;
  };
}

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);
  const [muteDuration, setMuteDuration] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProUser = subscriptionData?.subscribed || false;
  const isGroupCreator = group && user && members.find(m => m.user_id === user.id)?.role === 'creator';

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
      fetchMessages();
      fetchNotificationPrefs();
      
      // Set up real-time subscription for messages
      const messagesChannel = supabase
        .channel('group_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        }, (payload) => {
          fetchMessages(); // Refetch to get profile data
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [groupId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupData = async () => {
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          joined_at
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Get profile information for each member
        const membersWithProfiles = await Promise.all(
          membersData.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, display_name, avatar_url')
              .eq('user_id', member.user_id)
              .single();

            return {
              ...member,
              profiles: { 
                email: profile?.email || 'Unknown',
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url
              }
            };
          })
        );

      setMembers(membersWithProfiles);

    } catch (error) {
      console.error('Error fetching group data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group data',
        variant: 'destructive'
      });
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          user_id,
          message_type,
          content,
          created_at,
          recording_id,
          audio_url,
          duration_seconds,
          system_message,
          profiles (
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profile and recording information for each message
      const messagesWithDetails = await Promise.all(
        data.map(async (message) => {
          let profileResult = { data: null };
          
          // Only fetch profile for non-system messages
          if (!message.system_message && message.user_id) {
            profileResult = await supabase
              .from('profiles')
              .select('email, display_name, avatar_url')
              .eq('user_id', message.user_id)
              .single();
          }

          const recordingResult = message.recording_id
            ? await supabase
                .from('recordings')
                .select('title, audio_url, duration_seconds')
                .eq('id', message.recording_id)
                .single()
            : { data: null };

          return {
            ...message,
            profiles: { 
              email: profileResult.data?.email || 'System',
              display_name: profileResult.data?.display_name,
              avatar_url: profileResult.data?.avatar_url
            },
            recordings: recordingResult.data
          };
        })
      );

      setMessages(messagesWithDetails);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    console.log('Attempting to send message:', {
      groupId,
      userId: user?.id,
      messageContent: newMessage.trim()
    });

    setSending(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user?.id,
          message_type: 'text',
          content: newMessage.trim()
        });

      if (error) {
        console.error('Message insert error:', error);
        throw error;
      }

      console.log('Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke('send-group-invitation', {
        body: {
          groupId: groupId,
          email: inviteEmail.trim(),
          groupName: group?.name
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation sent successfully'
      });

      setInviteEmail('');
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      });
    } finally {
      setInviting(false);
    }
  };

  const toggleAudio = async (audioUrl: string, messageId: string) => {
    if (playingAudio === messageId && currentAudio) {
      // Stop current audio
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setPlayingAudio(null);
      setCurrentAudio(null);
    } else {
      try {
        // Stop any existing audio first
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        
        // Play new audio with mobile optimizations
        const audio = new Audio();
        
        // Mobile-specific settings
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        
        // Set up event handlers before setting src
        audio.onloadstart = () => {
          console.log('Audio loading started');
        };
        
        audio.oncanplay = () => {
          console.log('Audio can play');
        };
        
        audio.onended = () => {
          setPlayingAudio(null);
          setCurrentAudio(null);
        };
        
        audio.onerror = (e) => {
          console.error('Audio error:', e);
          setPlayingAudio(null);
          setCurrentAudio(null);
          toast({
            title: 'Error',
            description: 'Failed to play audio recording. Please try again.',
            variant: 'destructive'
          });
        };
        
        audio.onabort = () => {
          console.log('Audio playback aborted');
        };
        
        audio.onstalled = () => {
          console.log('Audio stalled');
        };
        
        // Set audio source
        audio.src = audioUrl;
        
        setCurrentAudio(audio);
        setPlayingAudio(messageId);
        
        // Load and play with better mobile support
        await audio.load();
        
        // For mobile devices, we need to handle play() promise properly
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise.catch((error) => {
            console.error('Play failed:', error);
            setPlayingAudio(null);
            setCurrentAudio(null);
            
            // Check if it's an interaction error (common on mobile)
            if (error.name === 'NotAllowedError') {
              toast({
                title: 'Audio Blocked',
                description: 'Please tap the play button to start audio playback.',
                variant: 'destructive'
              });
            } else {
              toast({
                title: 'Playback Error', 
                description: 'Unable to play audio. Please check your connection.',
                variant: 'destructive'
              });
            }
          });
        }
        
      } catch (error) {
        console.error('Toggle audio error:', error);
        setPlayingAudio(null);
        setCurrentAudio(null);
        toast({
          title: 'Error',
          description: 'Failed to initialize audio player',
          variant: 'destructive'
        });
      }
    }
  };

  const shareRecording = async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user?.id,
          message_type: 'recording',
          recording_id: recordingId
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Recording shared with the group'
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to share recording',
        variant: 'destructive'
      });
    }
  };

  const renameGroup = async () => {
    if (!newGroupName.trim() || !groupId) return;

    setRenaming(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: newGroupName.trim() })
        .eq('id', groupId);

      if (error) throw error;

      // Update local state
      if (group) {
        setGroup({ ...group, name: newGroupName.trim() });
      }

      toast({
        title: 'Success',
        description: 'Group name updated successfully'
      });

      setNewGroupName('');
      setIsRenameDialogOpen(false);
    } catch (error) {
      console.error('Error renaming group:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename group',
        variant: 'destructive'
      });
    } finally {
      setRenaming(false);
    }
  };

  const fetchNotificationPrefs = async () => {
    try {
      const { data } = await supabase
        .from('group_notification_preferences')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .single();
      
      setNotificationPrefs(data);
    } catch (error) {
      // No prefs set yet, that's ok
    }
  };

  const leaveGroup = async () => {
    if (!user || !groupId) return;

    setLeaving(true);
    try {
      // Get user's display name for system message
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', user.id)
        .single();

      const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'Someone';

      // Add system message
      await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          message_type: 'text',
          content: `${displayName} left the group`,
          system_message: true
        });

      // Remove user from group
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Left group',
        description: 'You have left the group successfully'
      });

      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave group',
        variant: 'destructive'
      });
    } finally {
      setLeaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!groupId) return;

    setDeleting(true);
    try {
      // Delete all group messages first
      await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);

      // Delete all group members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // Delete notification preferences
      await supabase
        .from('group_notification_preferences')
        .delete()
        .eq('group_id', groupId);

      // Finally delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Group deleted',
        description: 'The group has been deleted successfully'
      });

      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const muteNotifications = async (duration: string) => {
    if (!user || !groupId) return;

    let mutedUntil = null;
    const now = new Date();

    switch (duration) {
      case '8h':
        mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        break;
      case '1w':
        mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'forever':
        mutedUntil = new Date('2099-01-01');
        break;
      default:
        return;
    }

    try {
      const { error } = await supabase
        .from('group_notification_preferences')
        .upsert({
          user_id: user.id,
          group_id: groupId,
          muted_until: mutedUntil.toISOString()
        });

      if (error) throw error;

      setNotificationPrefs({ muted_until: mutedUntil.toISOString() });
      setMuteDialogOpen(false);

      const durationText = duration === '8h' ? '8 hours' : duration === '1w' ? '1 week' : 'indefinitely';
      toast({
        title: 'Notifications muted',
        description: `Group notifications muted for ${durationText}`
      });
    } catch (error) {
      console.error('Error muting notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to mute notifications',
        variant: 'destructive'
      });
    }
  };

  const unmuteNotifications = async () => {
    if (!user || !groupId) return;

    try {
      const { error } = await supabase
        .from('group_notification_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', groupId);

      if (error) throw error;

      setNotificationPrefs(null);
      toast({
        title: 'Notifications enabled',
        description: 'Group notifications have been enabled'
      });
    } catch (error) {
      console.error('Error unmuting notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive'
      });
    }
  };

  const isNotificationsMuted = () => {
    if (!notificationPrefs?.muted_until) return false;
    return new Date(notificationPrefs.muted_until) > new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar isProUser={isProUser} />
      
      <div className="container mx-auto p-4 max-w-2xl">
        {/* Group Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/groups')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{group?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {members.length} members
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsViewMembersOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Members
              </DropdownMenuItem>
              {isGroupCreator && (
                <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Rename Group
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMuteDialogOpen(true)}>
                {isNotificationsMuted() ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Unmute Notifications
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute Notifications
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={leaveGroup}
                disabled={leaving}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {leaving ? 'Leaving...' : 'Leave Group'}
              </DropdownMenuItem>
              {isGroupCreator && (
                <DropdownMenuItem 
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Dialogs */}
          <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Group Members ({members.length})</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">
                          {member.profiles.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profiles.display_name || member.profiles.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.profiles.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'creator' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Group Name
                  </label>
                  <Input
                    placeholder="Enter new group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && renameGroup()}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRenameDialogOpen(false);
                      setNewGroupName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={renameGroup}
                    disabled={!newGroupName.trim() || renaming}
                  >
                    {renaming ? 'Renaming...' : 'Rename Group'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && inviteMember()}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={inviteMember}
                    disabled={!inviteEmail.trim() || inviting}
                  >
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={muteDialogOpen} onOpenChange={setMuteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isNotificationsMuted() ? 'Unmute Notifications' : 'Mute Notifications'}
                </DialogTitle>
              </DialogHeader>
              {isNotificationsMuted() ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Notifications are currently muted for this group.
                  </p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMuteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={unmuteNotifications}>
                      Unmute
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    How long would you like to mute notifications?
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => muteNotifications('8h')}
                    >
                      For 8 hours
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => muteNotifications('1w')}
                    >
                      For 1 week
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => muteNotifications('forever')}
                    >
                      Until I turn it back on
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Group</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this group? This action cannot be undone. 
                  All messages and member data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteGroup}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete Group'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-6">

        {/* Chat Area */}
        <Card className="h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
               <div
                 key={message.id}
                 className={`flex ${
                   message.system_message 
                     ? 'justify-center' 
                     : message.user_id === user?.id 
                       ? 'justify-end' 
                       : 'justify-start'
                 }`}
               >
                 <div
                   className={`max-w-[80%] ${
                     message.system_message
                       ? 'bg-muted/50 text-muted-foreground border border-border'
                       : message.user_id === user?.id
                         ? 'bg-primary text-primary-foreground'
                         : 'bg-muted'
                   } rounded-lg p-3`}
                 >
                   {!message.system_message && (
                     <div className="flex items-center gap-2 mb-1">
                       <UserAvatar
                         avatarUrl={message.profiles?.avatar_url}
                         displayName={message.profiles?.display_name}
                         email={message.profiles?.email}
                         size="sm"
                       />
                       <span className="text-xs opacity-75">
                         {message.profiles?.display_name || message.profiles?.email?.split('@')[0] || 'Unknown'}
                       </span>
                       <span className="text-xs opacity-50">
                         {new Date(message.created_at).toLocaleTimeString()}
                       </span>
                     </div>
                   )}

                   {message.message_type === 'text' && !message.system_message && (
                     <p className="text-sm">{message.content}</p>
                   )}

                   {message.system_message && (
                     <p className="text-xs italic text-center">{message.content}</p>
                   )}

                  {message.message_type === 'recording_share' && (
                    <div className="bg-background/10 rounded p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Shared recording
                        </span>
                      </div>
                      <p className="text-xs opacity-75">{message.content}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAudio(message.audio_url!, message.id)}
                          className="h-8 w-8 p-0"
                        >
                          {playingAudio === message.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex items-center gap-1 text-xs opacity-75">
                          <Clock className="h-3 w-3" />
                          {message.duration_seconds && (
                            <>
                              {Math.floor(message.duration_seconds / 60)}:
                              {(message.duration_seconds % 60).toString().padStart(2, '0')}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        Shared by {message.profiles?.display_name || message.profiles?.email?.split('@')[0] || 'Unknown'}
                      </div>
                      {message.recording_id && message.duration_seconds && (
                        <GroupAISummary 
                          recordingId={message.recording_id}
                          duration={message.duration_seconds}
                          autoGenerate={message.duration_seconds < 120}
                        />
                      )}
                    </div>
                  )}

                   {message.message_type === 'recording' && message.recordings && (
                     <div className="bg-background/10 rounded p-3 space-y-3">
                       <div className="text-sm">
                         <span className="font-medium">
                           {message.profiles?.display_name || message.profiles?.email?.split('@')[0] || 'Someone'}
                         </span>
                         <span className="text-muted-foreground"> shared a recording </span>
                         <span className="font-medium">
                           ({Math.floor(message.recordings.duration_seconds / 60)}:{(message.recordings.duration_seconds % 60).toString().padStart(2, '0')} min)
                         </span>
                       </div>
                       
                       <div className="flex items-center gap-4 text-sm">
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => toggleAudio(message.recordings!.audio_url, message.id)}
                           className="gap-2 h-8 px-3"
                         >
                           {playingAudio === message.id ? (
                             <Pause className="h-4 w-4" />
                           ) : (
                             <Play className="h-4 w-4" />
                           )}
                           🎧 Play
                         </Button>
                       </div>
                       
                       {message.recording_id && (
                         <GroupAISummary 
                           recordingId={message.recording_id}
                           duration={message.recordings.duration_seconds}
                           autoGenerate={true}
                         />
                       )}
                     </div>
                   )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default GroupChat;