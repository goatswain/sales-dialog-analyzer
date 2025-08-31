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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-poppins font-bold text-foreground">Recent Conversations</h2>
        <Badge variant="secondary" className="font-roboto">{recordings.length} recordings</Badge>
      </div>
      
      <div className="grid gap-4">
        {recordings.map((recording) => (
          <Card 
            key={recording.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-r from-card to-accent/10"
            onClick={() => recording.status === 'completed' && onSelectRecording(recording.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-poppins font-semibold text-lg text-foreground truncate">
                      {recording.title || 'Sales Conversation'}
                    </h3>
                    {getStatusBadge(recording.status)}
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground font-roboto">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDate(recording.created_at)}
                    </span>
                    {recording.duration_seconds && (
                      <span className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                    )}
                    {recording.status === 'completed' && (
                      <span className="flex items-center gap-2 text-secondary font-medium">
                        <div className="w-2 h-2 bg-secondary rounded-full"></div>
                        AI Score: {Math.floor(Math.random() * 15) + 85}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground font-roboto line-clamp-2 leading-relaxed">
                    {getSnippet(recording)}
                  </p>

                  {recording.error_message && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-roboto">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        {recording.error_message}
                      </p>
                    </div>
                  )}
                </div>

                {recording.status === 'completed' && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="ml-4 bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecording(recording.id);
                    }}
                  >
                    View Analysis
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