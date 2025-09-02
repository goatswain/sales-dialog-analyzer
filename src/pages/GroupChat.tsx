import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Clock
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
  };
}

interface Message {
  id: string;
  user_id: string;
  message_type: string;
  content: string;
  created_at: string;
  recording_id: string | null;
  profiles: {
    email: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProUser = subscriptionData?.subscribed || false;

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
      fetchMessages();
      
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
            .select('email')
            .eq('user_id', member.user_id)
            .single();

          return {
            ...member,
            profiles: { email: profile?.email || 'Unknown' }
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
          recording_id
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profile and recording information for each message
      const messagesWithDetails = await Promise.all(
        data.map(async (message) => {
          const [profileResult, recordingResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('email')
              .eq('user_id', message.user_id)
              .single(),
            message.recording_id
              ? supabase
                  .from('recordings')
                  .select('title, audio_url, duration_seconds')
                  .eq('id', message.recording_id)
                  .single()
              : { data: null }
          ]);

          return {
            ...message,
            profiles: { email: profileResult.data?.email || 'Unknown' },
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

      if (error) throw error;

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
    if (playingAudio === messageId) {
      // Stop audio
      setPlayingAudio(null);
    } else {
      // Play audio
      setPlayingAudio(messageId);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
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

          <div className="flex gap-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Invite
              </Button>
            </DialogTrigger>
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
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={inviteMember}
                    disabled={!inviteEmail.trim() || inviting}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="space-y-6">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {member.profiles.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">
                    {member.profiles.email.split('@')[0]}
                  </span>
                </div>
                <Badge variant={member.role === 'creator' ? 'default' : 'secondary'} className="text-xs">
                  {member.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.user_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } rounded-lg p-3`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-75">
                      {message.profiles.email.split('@')[0]}
                    </span>
                    <span className="text-xs opacity-50">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {message.message_type === 'text' && (
                    <p className="text-sm">{message.content}</p>
                  )}

                  {message.message_type === 'recording' && message.recordings && (
                    <div className="bg-background/10 rounded p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {message.recordings.title || 'Audio Recording'}
                        </span>
                      </div>
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
                        <div className="flex items-center gap-1 text-xs opacity-75">
                          <Clock className="h-3 w-3" />
                          {Math.floor(message.recordings.duration_seconds / 60)}:
                          {(message.recordings.duration_seconds % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
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