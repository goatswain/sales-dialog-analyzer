import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import RecordingsList from '@/components/RecordingsList';
import TranscriptViewer from '@/components/TranscriptViewer';
import { useAuth } from '@/components/AuthGuard';

const Index = () => {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'home' | 'transcript'>('home');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [session, loading, navigate]);

  const handleUploadComplete = (recordingId: string) => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectRecording = (recordingId: string) => {
    setSelectedRecordingId(recordingId);
    setCurrentView('transcript');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedRecordingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to auth page
  }

  if (currentView === 'transcript' && selectedRecordingId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-7xl">
          {/* Header with logout */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Sales Recorder</h1>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <TranscriptViewer 
            recordingId={selectedRecordingId} 
            onBack={handleBackToHome}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-8">
          {/* Header with user info and logout */}
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold mb-2">Sales Recorder</h1>
              <p className="text-muted-foreground">
                Record, transcribe, and analyze your sales conversations with AI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Audio Recorder */}
          <AudioRecorder onUploadComplete={handleUploadComplete} />

          {/* Recordings List */}
          <RecordingsList 
            onSelectRecording={handleSelectRecording}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
