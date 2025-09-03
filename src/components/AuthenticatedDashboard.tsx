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
import { hasValidApiKey } from '@/components/ApiKeyManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [apiKeyDismissed, setApiKeyDismissed] = useState(false);

  const showApiKeyNotification = !hasValidApiKey() && !apiKeyDismissed;

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
      
      {/* API Key Setup Notification */}
      {showApiKeyNotification && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 p-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                      Setup Required: OpenAI API Key
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                      To enable audio transcription, you need to add your OpenAI API key. This is stored securely in your browser and never shared.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => navigate('/settings')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Setup API Key
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setApiKeyDismissed(true)}
                        className="text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 max-w-2xl space-y-8">
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