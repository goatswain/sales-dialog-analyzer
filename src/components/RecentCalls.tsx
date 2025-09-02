import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Recording {
  id: string;
  created_at: string;
  title: string;
  duration_seconds?: number;
  status: 'uploaded' | 'transcribing' | 'completed' | 'error';
  transcripts?: Array<{
    text: string;
  }>;
}

interface RecentCallsProps {
  onSelectRecording: (recordingId: string) => void;
  refreshTrigger?: number;
}

const RecentCalls: React.FC<RecentCallsProps> = ({ onSelectRecording, refreshTrigger }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRecentRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          created_at,
          title,
          duration_seconds,
          status,
          transcripts(text)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

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
    fetchRecentRecordings();
  }, [refreshTrigger]);

  // Set up real-time subscriptions for status updates
  useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    const channel = supabase
      .channel('recent_recordings_and_transcripts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recordings' },
        async (payload) => {
          console.log('📊 Recordings table change detected:', payload);
          await fetchRecentRecordings();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcripts' },
        async (payload) => {
          console.log('📝 Transcripts table change detected:', payload);
          await fetchRecentRecordings();
        }
      )
      .subscribe((status) => {
        console.log('📡 Recent calls subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from recent calls real-time updates');
      channel.unsubscribe();
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

  const getSnippet = (recording: Recording) => {
    if (recording.transcripts && recording.transcripts[0]?.text) {
      return recording.transcripts[0].text.substring(0, 60) + '...';
    }
    return recording.status === 'completed' ? 'No transcript available' : 'Processing...';
  };

  

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Calls</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Calls</h2>
        </div>
        <Card className="bg-accent/20">
          <CardContent className="p-6 text-center">
            <FileAudio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No calls yet. Record your first call to get started!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Calls</h2>
        <Badge variant="secondary" className="text-xs">{recordings.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {recordings.map((recording) => (
          <Card 
            key={recording.id} 
            className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 bg-card"
            onClick={() => recording.status === 'completed' && onSelectRecording(recording.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {recording.title || 'Sales Call'}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(recording.created_at)}
                    </span>
                    {recording.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <FileAudio className="w-3 h-3" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {getSnippet(recording)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button 
        variant="outline" 
        className="w-full mt-4"
        onClick={() => navigate('/calls')}
      >
        View All Calls
      </Button>
    </div>
  );
};

export default RecentCalls;