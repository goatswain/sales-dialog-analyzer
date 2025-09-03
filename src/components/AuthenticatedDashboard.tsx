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
    
    const testUrl = 'https://cuabhynevjfnswaciunm.supabase.co/storage/v1/object/public/audio-recordings/audio-2025-09-02T03-28-33-678Z-recording-1756783712038.wav';
    console.log('Testing audio URL:', testUrl);
    
    // Try multiple approaches
    
    // Method 1: Simple Audio object
    console.log('--- Method 1: Simple Audio object ---');
    const audio1 = new Audio();
    audio1.onloadstart = () => console.log('✅ Method 1: loadstart');
    audio1.oncanplaythrough = () => console.log('✅ Method 1: canplaythrough');
    audio1.onplay = () => console.log('✅ Method 1: playing');
    audio1.onerror = (e) => console.error('❌ Method 1 error:', e, audio1.error);
    audio1.src = testUrl;
    
    setTimeout(() => {
      audio1.play().then(() => {
        console.log('✅ Method 1: play promise resolved');
        setTimeout(() => audio1.pause(), 2000);
      }).catch(err => {
        console.error('❌ Method 1 play promise rejected:', err);
      });
    }, 1000);
    
    // Method 2: Create native audio element
    console.log('--- Method 2: Native HTML audio element ---');
    const audio2 = document.createElement('audio');
    audio2.controls = true;
    audio2.src = testUrl;
    audio2.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;';
    audio2.onloadstart = () => console.log('✅ Method 2: loadstart');
    audio2.oncanplaythrough = () => console.log('✅ Method 2: canplaythrough');
    audio2.onerror = (e) => console.error('❌ Method 2 error:', e, audio2.error);
    
    document.body.appendChild(audio2);
    
    // Remove the test element after 30 seconds
    setTimeout(() => {
      if (document.body.contains(audio2)) {
        document.body.removeChild(audio2);
      }
    }, 30000);
    
    // Method 3: Direct fetch test
    console.log('--- Method 3: Fetch test ---');
    fetch(testUrl, { method: 'HEAD' })
      .then(response => {
        console.log('✅ Method 3: Fetch successful', response.status, response.headers);
      })
      .catch(err => {
        console.error('❌ Method 3: Fetch failed:', err);
      });
      
    alert('Audio test started! Check console and look for native audio controls in top-right corner');
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