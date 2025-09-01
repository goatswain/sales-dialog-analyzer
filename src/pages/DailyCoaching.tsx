import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LogOut, ArrowLeft, Play, TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';

// Mock data - in real app this would come from your backend/API
const mockCoachingData = {
  topObjection: {
    type: "Price Objection",
    count: 4,
    totalCalls: 7,
    icon: "💰",
    color: "bg-orange-500"
  },
  struggles: [
    {
      timestamp: "00:45",
      prospect: "That's too expensive.",
      response: "Uh… well, it's high quality…",
      aiNote: "Response lacked confidence in value.",
      callId: "call-1"
    },
    {
      timestamp: "03:22", 
      prospect: "I need to think about it.",
      response: "Okay, sure, just let me know.",
      aiNote: "Missed opportunity to create urgency.",
      callId: "call-2"
    },
    {
      timestamp: "01:15",
      prospect: "We don't have budget for this right now.",
      response: "Maybe we can talk later then.",
      aiNote: "Could have explored budget timing better.",
      callId: "call-3"
    }
  ],
  improvements: [
    {
      situation: "When they say it's too expensive",
      suggestion: "I completely understand — many of our customers felt the same way until they saw how much they save on [specific benefit]. What if I could show you how this pays for itself in the first month?"
    },
    {
      situation: "When they need to think about it", 
      suggestion: "I totally get that — this is an important decision. What specific concerns do you have? Maybe we can address those right now so you have all the information you need."
    },
    {
      situation: "When budget is mentioned",
      suggestion: "Budget is always important to consider. Help me understand — is this about the total investment, or the timing of when you'd implement this?"
    }
  ],
  progress: {
    thisWeek: 65,
    lastWeek: 45,
    trend: "up",
    improvement: 20
  },
  motivation: {
    type: "positive",
    message: "🔥 You're 20% better at handling objections than last week. Keep pushing!"
  }
};

const DailyCoaching = () => {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [session, loading, navigate]);

  const handlePlayAudio = (suggestion: string) => {
    // Placeholder for TTS functionality
    toast({
      title: "Practice Mode",
      description: "Audio playback will be implemented with TTS integration.",
    });
  };

  const handlePlayTimestamp = (callId: string, timestamp: string) => {
    toast({
      title: "Play Recording",
      description: `Would jump to ${timestamp} in ${callId}`,
    });
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
    return null;
  }

  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img 
              src="/lovable-uploads/0661e838-ae1b-4b7a-ba8d-98e91f080271.png" 
              alt="Swain AI Logo" 
              className="w-12 h-12 object-contain"
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

      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Daily Coaching Report</h1>
          <p className="text-muted-foreground text-lg">Based on today's calls, here's what to focus on.</p>
        </div>

        <div className="space-y-8">
          {/* Top Objection Highlight Card */}
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-background dark:from-orange-950/20 dark:to-background">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-2xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-orange-700 dark:text-orange-300">
                    Objection You Struggled With Most: {mockCoachingData.topObjection.type}
                  </CardTitle>
                  <CardDescription className="text-orange-600 dark:text-orange-400 font-medium">
                    This came up in {mockCoachingData.topObjection.count} of your {mockCoachingData.topObjection.totalCalls} conversations today.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Examples Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Where You Struggled</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockCoachingData.struggles.map((struggle, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                      {struggle.timestamp}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePlayTimestamp(struggle.callId, struggle.timestamp)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Play
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <strong className="text-sm text-muted-foreground">Prospect:</strong>
                      <p className="text-foreground">"{struggle.prospect}"</p>
                    </div>
                    <div>
                      <strong className="text-sm text-muted-foreground">Your Response:</strong>
                      <p className="text-foreground">"{struggle.response}"</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border-l-2 border-l-amber-400">
                      <strong className="text-sm text-amber-700 dark:text-amber-300">AI Note:</strong>
                      <p className="text-amber-600 dark:text-amber-400 text-sm">{struggle.aiNote}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Coaching Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <span>How to Improve</span>
              </CardTitle>
              <CardDescription>
                Here are AI-generated alternative responses you can practice:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockCoachingData.improvements.map((improvement, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-green-50/50 dark:bg-green-950/10">
                  <div>
                    <strong className="text-sm text-muted-foreground">When:</strong>
                    <p className="text-foreground font-medium">{improvement.situation}</p>
                  </div>
                  
                  <div>
                    <strong className="text-sm text-muted-foreground">Try saying:</strong>
                    <p className="text-foreground bg-background border rounded p-3 mt-1">
                      "{improvement.suggestion}"
                    </p>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handlePlayAudio(improvement.suggestion)}
                    className="mt-2"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Practice This
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Progress Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Your Progress Over Time</span>
              </CardTitle>
              <CardDescription>
                Price Objections Handled Successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This Week</span>
                  <span className="font-medium">{mockCoachingData.progress.thisWeek}%</span>
                </div>
                <Progress value={mockCoachingData.progress.thisWeek} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <span className="text-sm text-muted-foreground">Improvement from last week:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  +{mockCoachingData.progress.improvement}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Motivational Message */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-center text-lg font-medium text-foreground">
                {mockCoachingData.motivation.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DailyCoaching;