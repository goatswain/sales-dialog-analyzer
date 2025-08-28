import React, { useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import RecordingsList from '@/components/RecordingsList';
import TranscriptViewer from '@/components/TranscriptViewer';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'transcript'>('home');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  if (currentView === 'transcript' && selectedRecordingId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-7xl">
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
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Sales Recorder</h1>
            <p className="text-muted-foreground">
              Record, transcribe, and analyze your sales conversations with AI
            </p>
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
