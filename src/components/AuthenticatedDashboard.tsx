import React, { useState } from 'react';
import RecordButton from '@/components/RecordButton';
import UploadButton from '@/components/UploadButton';
import RecentCalls from '@/components/RecentCalls';
import TranscriptViewer from '@/components/TranscriptViewer';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AuthenticatedDashboardProps {
  currentView: 'home' | 'transcript';
  selectedRecordingId: string | null;
  refreshTrigger: number;
  onSelectRecording: (recordingId: string) => void;
  onBackToHome: () => void;
  onUploadComplete: (recordingId: string) => void;
  session?: Session | null;
}

export const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  currentView,
  selectedRecordingId,
  refreshTrigger,
  onSelectRecording,
  onBackToHome,
  onUploadComplete,
  session
}) => {
  const { subscriptionData, showSuccessBanner, dismissSuccessBanner } = useSubscription();
  const isProUser = subscriptionData?.subscribed || false;

  // Test audio function
  const testAudio = () => {
    console.log('🔥 AUDIO TEST BUTTON CLICKED!');
    alert('Audio test clicked! Check console for logs.');
    
    const testUrl = 'https://cuabhynevjfnswaciunm.supabase.co/storage/v1/object/public/audio-recordings/audio-2025-09-02T03-28-33-678Z-recording-1756783712038.wav';
    console.log('Testing audio URL:', testUrl);
    
    const audio = new Audio(testUrl);
    
    audio.onloadstart = () => console.log('✅ Audio loadstart');
    audio.oncanplay = () => console.log('✅ Audio canplay');
    audio.onplay = () => console.log('✅ Audio playing');
    audio.onerror = (e) => console.error('❌ Audio error:', e);
    
    audio.play().then(() => {
      console.log('✅ Audio play promise resolved');
    }).catch(err => {
      console.error('❌ Audio play promise rejected:', err);
    });
  };

  if (currentView === 'transcript' && selectedRecordingId) {
    return (
      <div className="min-h-screen bg-background font-roboto pb-16">
        {/* Success Banner */}
        <SubscriptionBanner 
          show={showSuccessBanner} 
          onDismiss={dismissSuccessBanner}
        />
        
        <div className={showSuccessBanner ? 'pt-16' : ''}>
          <TopBar isProUser={isProUser} />
        </div>
        
        <div className="container mx-auto p-6 max-w-7xl">
          <TranscriptViewer 
            recordingId={selectedRecordingId} 
            onBack={onBackToHome}
          />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-roboto pb-16">
      {/* Success Banner */}
      <SubscriptionBanner 
        show={showSuccessBanner} 
        onDismiss={dismissSuccessBanner}
      />
      
      <div className={showSuccessBanner ? 'pt-16' : ''}>
        <TopBar isProUser={isProUser} />
      </div>

      <div className="container mx-auto p-4 max-w-2xl space-y-8">
        {/* Audio Test Button */}
        <Card className="border-2 border-red-500">
          <CardContent className="p-4 text-center">
            <h3 className="font-bold text-red-600 mb-2">🔧 AUDIO DEBUG TEST</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click this button and check your browser console (F12 → Console)
            </p>
            <Button onClick={testAudio} variant="destructive" size="lg">
              🎵 TEST AUDIO NOW
            </Button>
          </CardContent>
        </Card>

        {/* Main Record Button */}
        <div className="text-center py-8">
          <RecordButton onUploadComplete={onUploadComplete} session={session} />
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <UploadButton onUploadComplete={onUploadComplete} session={session} />
        </div>

        {/* Recent Calls */}
        <RecentCalls 
          onSelectRecording={onSelectRecording}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <BottomNavigation />
    </div>
  );
};