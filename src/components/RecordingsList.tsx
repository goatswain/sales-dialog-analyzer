import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileAudio, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

      setRecordings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [refreshTrigger]);

  // Set up real-time subscription for status updates
  useEffect(() => {
    const subscription = supabase
      .channel('recordings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recordings' },
        () => {
          fetchRecordings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading recordings...
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <FileAudio className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
          <p className="text-muted-foreground">
            Upload or record your first sales conversation to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Your Recordings</CardTitle>
      </CardHeader>
      
      {recordings.map((recording) => (
        <Card 
          key={recording.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => recording.status === 'completed' && onSelectRecording(recording.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold truncate">
                    {recording.title || 'Untitled Recording'}
                  </h3>
                  {getStatusBadge(recording.status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(recording.created_at)}
                  </span>
                  {recording.duration_seconds && (
                    <span>{formatDuration(recording.duration_seconds)}</span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getSnippet(recording)}
                </p>

                {recording.error_message && (
                  <p className="text-sm text-destructive mt-2">
                    Error: {recording.error_message}
                  </p>
                )}
              </div>

              {recording.status === 'completed' && (
                <Button 
                  variant="ghost" 
                  size="sm"
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
  );
};

export default RecordingsList;