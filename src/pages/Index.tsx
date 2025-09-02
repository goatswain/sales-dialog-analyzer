import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '@/components/AudioRecorder';
import RecordingsList from '@/components/RecordingsList';
import TranscriptViewer from '@/components/TranscriptViewer';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthGuard';
import { useSubscription } from '@/hooks/useSubscription';

const Index = () => {
  const { user, session, loading, signOut } = useAuth();
  const { subscriptionData, showSuccessBanner, dismissSuccessBanner } = useSubscription();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'home' | 'transcript'>('home');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isProUser = subscriptionData?.subscribed || false;

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
        {/* Success Banner */}
        <SubscriptionBanner 
          show={showSuccessBanner} 
          onDismiss={dismissSuccessBanner}
        />
        
        <div className={showSuccessBanner ? 'pt-16' : ''}>
          <Header isProUser={isProUser} />
        </div>
        
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
      {/* Success Banner */}
      <SubscriptionBanner 
        show={showSuccessBanner} 
        onDismiss={dismissSuccessBanner}
      />
      
      <div className={showSuccessBanner ? 'pt-16' : ''}>
        <Header isProUser={isProUser} />
      </div>

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
