import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, FileAudio, Loader2, AlertCircle, Edit2, Check, X, Trash2, Search, MoreVertical, Play, FileText, Share } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SendToGroupDrawer from '@/components/SendToGroupDrawer';

interface Recording {
  id: string;
  created_at: string;
  title: string;
  duration_seconds?: number;
  status: 'uploaded' | 'transcribing' | 'completed' | 'error';
  error_message?: string;
  audio_url?: string;
  transcripts?: Array<{
    text: string;
  }>;
}

const Calls = () => {
  const navigate = useNavigate();
  const { subscriptionData } = useSubscription();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const isProUser = subscriptionData?.subscribed || false;

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          created_at,
          title,
          duration_seconds,
          status,
          error_message,
          audio_url,
          transcripts(text)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        return;
      }

      setRecordings((data || []).map(recording => ({
        ...recording,
        status: recording.status as 'uploaded' | 'transcribing' | 'completed' | 'error'
      })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Set up real-time subscriptions for status updates
  useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions for all calls...');
    
    const channel = supabase
      .channel('all_recordings_and_transcripts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recordings' },
        async (payload) => {
          console.log('📊 Recordings table change detected:', payload);
          await fetchRecordings();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcripts' },
        async (payload) => {
          console.log('📝 Transcripts table change detected:', payload);
          await fetchRecordings();
        }
      )
      .subscribe((status) => {
        console.log('📡 All calls subscription status:', status);
      });

    // Fallback: Poll for updates every 10 seconds
    const pollInterval = setInterval(async () => {
      console.log('🔄 Polling for updates (fallback)...');
      await fetchRecordings();
    }, 10000);

    return () => {
      console.log('🔌 Unsubscribing from all calls real-time updates');
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const filteredRecordings = recordings.filter(recording =>
    recording.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.transcripts?.[0]?.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: Recording['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Ready</Badge>;
      case 'transcribing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'uploaded':
        return <Badge variant="secondary">Uploaded</Badge>;
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSnippet = (recording: Recording) => {
    if (recording.transcripts && recording.transcripts[0]?.text) {
      return recording.transcripts[0].text.substring(0, 100) + '...';
    }
    return recording.status === 'completed' ? 'No transcript available' : 'Processing...';
  };

  const getScore = () => Math.floor(Math.random() * 15) + 85;

  const startEditing = (recording: Recording) => {
    setEditingId(recording.id);
    setEditTitle(recording.title || 'Sales Call');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveTitle = async (recordingId: string) => {
    if (!editTitle.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ title: editTitle.trim() })
        .eq('id', recordingId);

      if (error) {
        console.error('Error updating title:', error);
        return;
      }

      setRecordings(prev => prev.map(recording => 
        recording.id === recordingId 
          ? { ...recording, title: editTitle.trim() }
          : recording
      ));
      
      toast({
        title: "Title Updated",
        description: "Recording title has been updated successfully.",
      });
      
      cancelEditing();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update recording title. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    setDeleting(recordingId);
    try {
      await supabase
        .from('transcripts')
        .delete()
        .eq('recording_id', recordingId);

      await supabase
        .from('conversation_notes')
        .delete()
        .eq('recording_id', recordingId);

      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) {
        console.error('Error deleting recording:', error);
        return;
      }

      setRecordings(prev => prev.filter(recording => recording.id !== recordingId));
      
      toast({
        title: "Recording Deleted",
        description: "Recording has been permanently deleted.",
      });
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSendToGroup = (recording: Recording) => {
    setSelectedRecording(recording);
    setShareDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar isProUser={isProUser} />
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />
            <span className="text-muted-foreground">Loading your calls...</span>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar isProUser={isProUser} />
      
      <div className="container mx-auto p-4 max-w-2xl space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">All Calls</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search calls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Recordings List */}
        {filteredRecordings.length === 0 ? (
          <Card className="bg-accent/20">
            <CardContent className="p-8 text-center">
              <FileAudio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {searchQuery ? 'No matching calls found' : 'No calls yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Try a different search term' 
                  : 'Start by recording or uploading your first sales conversation'
                }
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/')}
                >
                  Record Your First Call
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecordings.map((recording) => (
              <Card 
                key={recording.id} 
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border-0 bg-card"
                onClick={() => recording.status === 'completed' && navigate('/', { state: { recordingId: recording.id } })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {editingId === recording.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 text-base font-medium"
                              placeholder="Recording title"
                              disabled={saving}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveTitle(recording.id);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveTitle(recording.id);
                              }}
                              disabled={saving || !editTitle.trim()}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditing();
                              }}
                              disabled={saving}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3 className="font-medium text-base text-foreground truncate flex-1">
                              {recording.title || 'Sales Call'}
                            </h3>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {recording.status === 'completed' && (
                                <Badge variant="secondary" className="text-xs mr-2">
                                  {getScore()}%
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (recording.status === 'completed') {
                                        navigate('/', { state: { recordingId: recording.id } });
                                      }
                                    }}
                                    disabled={recording.status !== 'completed'}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Play
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (recording.status === 'completed') {
                                        navigate('/', { state: { recordingId: recording.id } });
                                      }
                                    }}
                                    disabled={recording.status !== 'completed'}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Transcript
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(recording);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendToGroup(recording);
                                    }}
                                    disabled={!recording.audio_url || recording.status !== 'completed'}
                                  >
                                    <Share className="w-4 h-4 mr-2" />
                                    Send to Group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}
                        <div className="flex-shrink-0">
                          {getStatusBadge(recording.status)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(recording.created_at)}
                        </span>
                        {recording.duration_seconds && (
                          <span className="flex items-center gap-1">
                            <FileAudio className="w-4 h-4" />
                            {formatDuration(recording.duration_seconds)}
                          </span>
                        )}
                        {!editingId && recording.status === 'completed' && (
                          <Badge variant="secondary" className="text-xs group-hover:hidden">
                            {getScore()}%
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {getSnippet(recording)}
                      </p>

                      {recording.error_message && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                          <p className="text-sm text-destructive">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            {recording.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SendToGroupDrawer
        open={shareDrawerOpen}
        onOpenChange={setShareDrawerOpen}
        recording={selectedRecording}
      />

      <BottomNavigation />
    </div>
  );
};

export default Calls;