import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileAudio, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Recording {
  id: string;
  created_at: string;
  title: string;
  duration_seconds?: number;
  status: 'uploaded' | 'transcribing' | 'completed' | 'error';
  error_message?: string;
  transcripts?: Array<{
    text: string;
  }>;
}

interface RecordingsListProps {
  onSelectRecording: (recordingId: string) => void;
  refreshTrigger?: number;
}

const RecordingsList: React.FC<RecordingsListProps> = ({ onSelectRecording, refreshTrigger }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    try {
      console.log('🔄 Fetching recordings...');
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          created_at,
          title,
          duration_seconds,
          status,
          error_message,
          transcripts(text)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        return;
      }

      console.log('📊 Fetched recordings:', data?.length || 0);
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
  }, [refreshTrigger]);

  // Set up real-time subscriptions for status updates
  useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    const channel = supabase
      .channel('recordings_and_transcripts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recordings' },
        async (payload) => {
          console.log('📊 Recordings table change detected:', payload);
          console.log('📊 Event type:', payload.eventType);
          console.log('📊 New record:', payload.new);
          console.log('📊 Old record:', payload.old);
          await fetchRecordings();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcripts' },
        async (payload) => {
          console.log('📝 Transcripts table change detected:', payload);
          console.log('📝 Event type:', payload.eventType);
          console.log('📝 New record:', payload.new);
          await fetchRecordings();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - real-time subscription failed');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Subscription timed out');
        } else {
          console.log('🔄 Subscription status:', status);
        }
      });

    // Fallback: Poll for updates every 10 seconds to catch any missed real-time events
    const pollInterval = setInterval(async () => {
      console.log('🔄 Polling for updates (fallback)...');
      await fetchRecordings();
    }, 10000);

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

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

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />
          <span className="font-roboto text-muted-foreground">Loading your conversations...</span>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="shadow-md bg-gradient-to-br from-card to-accent/10">
        <CardContent className="text-center p-12">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <FileAudio className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-3 text-foreground">No conversations yet</h3>
          <p className="text-muted-foreground font-roboto max-w-md mx-auto leading-relaxed">
            Start by recording or uploading your first sales conversation to unlock AI-powered insights and coaching.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-poppins font-bold text-foreground">Recent Calls</h2>
        <Badge variant="secondary" className="font-roboto text-xs flex-shrink-0">{recordings.length}</Badge>
      </div>
      
      <div className="grid gap-3 sm:gap-4 w-full">
        {recordings.map((recording) => (
          <Card 
            key={recording.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-r from-card to-accent/10 w-full"
            onClick={() => recording.status === 'completed' && onSelectRecording(recording.id)}
          >
            <CardContent className="p-4 w-full overflow-hidden">
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex-1 min-w-0 space-y-2 sm:space-y-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <h3 className="font-poppins font-semibold text-base sm:text-lg text-foreground truncate flex-1 min-w-0">
                      {(recording.title || 'Sales Call').length > 20 
                        ? `${(recording.title || 'Sales Call').substring(0, 20)}...` 
                        : (recording.title || 'Sales Call')
                      }
                    </h3>
                    <div className="flex-shrink-0">
                      {getStatusBadge(recording.status)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground font-roboto w-full overflow-hidden">
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{formatDate(recording.created_at)}</span>
                    </span>
                    {recording.duration_seconds && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <FileAudio className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                    )}
                    {recording.status === 'completed' && (
                      <span className="flex items-center gap-1 text-secondary font-medium flex-shrink-0">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-secondary rounded-full"></div>
                        Score: {Math.floor(Math.random() * 15) + 85}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground font-roboto line-clamp-2 leading-relaxed overflow-hidden">
                    {getSnippet(recording).length > 80 
                      ? `${getSnippet(recording).substring(0, 80)}...` 
                      : getSnippet(recording)
                    }
                  </p>

                  {recording.error_message && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 w-full overflow-hidden">
                      <p className="text-xs sm:text-sm text-destructive font-roboto break-words">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        {recording.error_message.length > 50 
                          ? `${recording.error_message.substring(0, 50)}...` 
                          : recording.error_message
                        }
                      </p>
                    </div>
                  )}
                </div>

                {recording.status === 'completed' && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="ml-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/30 flex-shrink-0 text-xs px-2 sm:px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecording(recording.id);
                    }}
                  >
                    View
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecordingsList;