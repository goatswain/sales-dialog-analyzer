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
      <div className="min-h-screen bg-background font-roboto">
        {/* Professional Top Bar */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/0661e838-ae1b-4b7a-ba8d-98e91f080271.png" 
                alt="Swain AI Logo" 
                className="w-20 h-20 object-contain"
              />
              <h1 className="text-xl font-poppins font-bold text-foreground">Swain AI</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Welcome,</span>
                <span className="font-medium">{user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-secondary-foreground font-medium text-sm">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto p-6 max-w-7xl">
          <TranscriptViewer 
            recordingId={selectedRecordingId} 
            onBack={handleBackToHome}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Professional Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-full">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <img 
                src="/lovable-uploads/0661e838-ae1b-4b7a-ba8d-98e91f080271.png" 
                alt="Swain AI Logo" 
                className="w-20 h-20 object-contain flex-shrink-0"
              />
              <h1 className="text-lg sm:text-xl font-poppins font-bold text-foreground truncate">Swain AI</h1>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Welcome,</span>
                <span className="font-medium max-w-[100px] truncate">{user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-secondary-foreground font-medium text-sm">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
      </header>

        <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
          <div className="space-y-6">
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
