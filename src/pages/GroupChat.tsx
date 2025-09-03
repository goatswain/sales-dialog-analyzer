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
import { sanitizeInput, validateEmail, sanitizeMessageContent } from '@/utils/sanitize';

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

  const fetchNotificationPrefs = async () => {
    try {
      const { data, error } = await supabase
        .from('group_notification_preferences')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification preferences:', error);
        return;
      }

      setNotificationPrefs(data);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Sanitize message content before sending
    const sanitizedMessage = sanitizeMessageContent(newMessage.trim());
    if (!sanitizedMessage) {
      toast({
        title: 'Error',
        description: 'Message content is invalid',
        variant: 'destructive'
      });
      return;
    }

    console.log('Attempting to send message:', {
      groupId,
      userId: user?.id,
      messageContent: sanitizedMessage
    });

    setSending(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          user_id: user?.id,
          message_type: 'text',
          content: sanitizedMessage
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

    // Validate and sanitize email
    const sanitizedEmail = sanitizeInput(inviteEmail.trim());
    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke('send-group-invitation', {
        body: {
          groupId: groupId,
          email: sanitizedEmail,
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

    // Sanitize group name
    const sanitizedName = sanitizeInput(newGroupName.trim(), 100);
    if (!sanitizedName) {
      toast({
        title: 'Error',
        description: 'Group name is invalid',
        variant: 'destructive'
      });
      return;
    }

    setRenaming(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: sanitizedName })
        .eq('id', groupId);

      if (error) throw error;

      // Update local state
      if (group) {
        setGroup({ ...group, name: sanitizedName });
      }

      toast({
        title: 'Success',
        description: 'Group name updated successfully'
      });

      setIsRenameDialogOpen(false);
      setNewGroupName('');
    } catch (error) {
      console.error('Error renaming group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group name',
        variant: 'destructive'
      });
    } finally {
      setRenaming(false);
    }
  };

  const deleteGroup = async () => {
    if (!groupId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group deleted successfully'
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

  const leaveGroup = async () => {
    if (!groupId || !user) return;
    
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Left group successfully'
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

  const muteGroup = async () => {
    if (!groupId || !user || !muteDuration) return;

    const duration = parseInt(muteDuration);
    const muteUntil = new Date(Date.now() + duration * 60 * 1000);

    try {
      const { error } = await supabase
        .from('group_notification_preferences')
        .upsert({
          group_id: groupId,
          user_id: user.id,
          muted_until: muteUntil.toISOString()
        });

      if (error) throw error;

      setNotificationPrefs({ muted_until: muteUntil.toISOString() });
      setMuteDialogOpen(false);
      setMuteDuration('');

      toast({
        title: 'Success',
        description: `Group muted for ${duration} minutes`
      });
    } catch (error) {
      console.error('Error muting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to mute group',
        variant: 'destructive'
      });
    }
  };

  const unmuteGroup = async () => {
    if (!groupId || !user) return;

    try {
      const { error } = await supabase
        .from('group_notification_preferences')
        .upsert({
          group_id: groupId,
          user_id: user.id,
          muted_until: null
        });

      if (error) throw error;

      setNotificationPrefs({ muted_until: null });

      toast({
        title: 'Success',
        description: 'Group unmuted'
      });
    } catch (error) {
      console.error('Error unmuting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to unmute group',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isMuted = notificationPrefs?.muted_until && new Date(notificationPrefs.muted_until) > new Date();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Group not found</p>
          <Button onClick={() => navigate('/groups')} className="mt-4">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar isProUser={isProUser} />
      
      {/* Group Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/groups')}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{sanitizeInput(group.name)}</h1>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
                {isMuted && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <BellOff className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications Toggle */}
            {isMuted ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={unmuteGroup}
                className="hidden sm:flex"
              >
                <BellOff className="h-4 w-4" />
              </Button>
            ) : (
              <Dialog open={muteDialogOpen} onOpenChange={setMuteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    <Bell className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mute Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      How long would you like to mute notifications for this group?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setMuteDuration('15')}
                        className={muteDuration === '15' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        15 minutes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMuteDuration('60')}
                        className={muteDuration === '60' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        1 hour
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMuteDuration('480')}
                        className={muteDuration === '480' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        8 hours
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMuteDuration('1440')}
                        className={muteDuration === '1440' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        24 hours
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMuteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={muteGroup} disabled={!muteDuration}>
                      Mute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* View Members */}
            <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Group Members</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar 
                          user={{
                            display_name: member.profiles.display_name,
                            email: member.profiles.email,
                            avatar_url: member.profiles.avatar_url
                          }} 
                        />
                        <div>
                          <p className="font-medium">
                            {sanitizeInput(member.profiles.display_name || member.profiles.email)}
                          </p>
                          {member.role === 'creator' && (
                            <Badge variant="secondary" className="text-xs">
                              Creator
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Group Settings Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </DropdownMenuItem>
                
                {isGroupCreator && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => {
                        setNewGroupName(group.name);
                        setIsRenameDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Rename Group
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </DropdownMenuItem>
                  </>
                )}
                
                {!isGroupCreator && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={leaveGroup}
                      className="text-destructive focus:text-destructive"
                      disabled={leaving}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {leaving ? 'Leaving...' : 'Leave Group'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 pb-24 max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="group">
              {message.system_message ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {sanitizeInput(message.content)}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <UserAvatar user={message.profiles} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">
                        {sanitizeInput(message.profiles.display_name || message.profiles.email)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                    
                    {message.message_type === 'text' && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">{sanitizeInput(message.content)}</p>
                      </div>
                    )}
                    
                    {message.message_type === 'recording' && message.recordings && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleAudio(message.recordings!.audio_url, message.id)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === message.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1 text-sm">
                            <p className="font-medium">
                              {sanitizeInput(message.recordings.title || 'Audio Recording')}
                            </p>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(message.recordings.duration_seconds)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* AI Summary for recordings */}
                        {message.recording_id && (
                          <GroupAISummary 
                            recordingId={message.recording_id} 
                            duration={message.recordings.duration_seconds}
                            autoGenerate={false}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-16 p-4">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
            className="flex gap-3"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
              maxLength={10000}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={sending || !newMessage.trim()}
              className="px-4"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      <BottomNavigation />

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={inviteMember} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Group Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name..."
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={renameGroup} disabled={renaming || !newGroupName.trim()}>
              {renaming ? 'Updating...' : 'Update Name'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone.
              All messages and shared recordings will be permanently deleted.
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
  );
};

export default GroupChat;
