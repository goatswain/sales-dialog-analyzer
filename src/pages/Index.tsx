import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, BarChart3, Users, ArrowRight, Star, CheckCircle } from 'lucide-react';
import RecordButton from '@/components/RecordButton';
import UploadButton from '@/components/UploadButton';
import RecentCalls from '@/components/RecentCalls';
import TranscriptViewer from '@/components/TranscriptViewer';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/components/AuthGuard';
import { useSubscription } from '@/hooks/useSubscription';
import dashboardPreview from '@/assets/dashboard-preview.jpg';

const Index = () => {
  const { user, session, loading } = useAuth();
  const { subscriptionData, showSuccessBanner, dismissSuccessBanner } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'transcript'>('home');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isProUser = subscriptionData?.subscribed || false;

  // Check if we should show transcript view from navigation
  useEffect(() => {
    if (location.state?.recordingId) {
      setSelectedRecordingId(location.state.recordingId);
      setCurrentView('transcript');
    }
  }, [location.state]);

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

  // If user is not logged in, show landing page
  if (!loading && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4b956a83-9e3a-439f-bc16-98cefe4019ea.png" 
                alt="SwainAI Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-poppins font-bold text-foreground">SwainAI</h1>
                <p className="text-sm text-muted-foreground">Your AI Sales Coach</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="text-foreground border-border hover:bg-accent"
            >
              Log In
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-poppins font-bold text-foreground leading-tight">
                  Sell Smarter. <br />
                  <span className="text-primary">Close More.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  SwainAI analyzes your sales calls, spots your weaknesses, and coaches you into a top closer.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Sign Up Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-8 py-6 border-border hover:bg-accent"
                >
                  Log In
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={dashboardPreview}
                alt="SwainAI Dashboard Preview"
                className="rounded-xl shadow-2xl border border-border w-full"
              />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-card/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-foreground mb-4">
                Transform Your Sales Performance
              </h2>
              <p className="text-xl text-muted-foreground">
                Three powerful features that make you a better closer
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mic className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Record & Upload Calls</h3>
                  <p className="text-muted-foreground">
                    Capture your conversations in seconds. Upload existing recordings or record live calls directly.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">AI Coaching Reports</h3>
                  <p className="text-muted-foreground">
                    Daily, weekly, or monthly insights on objections & improvement areas. Know exactly what to fix.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Team Feedback</h3>
                  <p className="text-muted-foreground">
                    Share calls in group chats for peer or manager input. Learn from your team's expertise.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-foreground mb-4">
                Trusted by Top Performers
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6">
                <CardContent className="space-y-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground italic">
                    "SwainAI helped me spot the objections costing me deals. Closed 3 more clients this week."
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-semibold">John D.</div>
                    <div>Sales Rep</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardContent className="space-y-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground italic">
                    "The AI coaching is like having a sales manager reviewing every call. Game changer for our team."
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-semibold">Sarah M.</div>
                    <div>Sales Manager</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardContent className="space-y-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground italic">
                    "My close rate improved 40% in the first month. SwainAI shows you exactly what you're missing."
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-semibold">Mike R.</div>
                    <div>Enterprise Sales</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-card/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground">
                Three simple steps to sales mastery
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-primary-foreground font-bold text-lg">
                  1
                </div>
                <h3 className="text-xl font-semibold text-foreground">Upload or Record</h3>
                <p className="text-muted-foreground">
                  Upload existing call recordings or record new ones directly in the app.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-primary-foreground font-bold text-lg">
                  2
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI Analysis</h3>
                <p className="text-muted-foreground">
                  AI analyzes tone, objections, and missed opportunities in your conversations.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-primary-foreground font-bold text-lg">
                  3
                </div>
                <h3 className="text-xl font-semibold text-foreground">Receive Reports</h3>
                <p className="text-muted-foreground">
                  Get detailed coaching reports & feedback automatically delivered to your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-foreground">
                Ready to close more deals?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of sales professionals who are already using SwainAI to boost their performance.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="text-lg px-12 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Sign Up Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">© 2024 SwainAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

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
            onBack={handleBackToHome}
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
          <RecordButton onUploadComplete={handleUploadComplete} />
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <UploadButton onUploadComplete={handleUploadComplete} />
        </div>

        {/* Recent Calls */}
        <RecentCalls 
          onSelectRecording={handleSelectRecording}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
