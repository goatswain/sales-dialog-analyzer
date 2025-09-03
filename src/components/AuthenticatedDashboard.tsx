import React, { useState } from 'react';
import RecordButton from '@/components/RecordButton';
import UploadButton from '@/components/UploadButton';
import RecentCalls from '@/components/RecentCalls';
import TranscriptViewer from '@/components/TranscriptViewer';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';

interface AuthenticatedDashboardProps {
  currentView: 'home' | 'transcript';
  selectedRecordingId: string | null;
  refreshTrigger: number;
  onSelectRecording: (recordingId: string) => void;
  onBackToHome: () => void;
  onUploadComplete: (recordingId: string) => void;
}

export const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({
  currentView,
  selectedRecordingId,
  refreshTrigger,
  onSelectRecording,
  onBackToHome,
  onUploadComplete
}) => {
  const { subscriptionData, showSuccessBanner, dismissSuccessBanner } = useSubscription();
  const isProUser = subscriptionData?.subscribed || false;

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
        {/* Main Record Button */}
        <div className="text-center py-8">
          <RecordButton onUploadComplete={onUploadComplete} />
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <UploadButton onUploadComplete={onUploadComplete} />
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