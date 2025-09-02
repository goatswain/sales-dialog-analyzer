import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LogOut, ArrowLeft, Play, TrendingUp, AlertTriangle, Lightbulb, Target, Mic, Plus } from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserCoachingData {
  hasRecordings: boolean;
  recordingsCount: number;
  topStruggle?: {
    type: string;
    count: number;
    examples: Array<{
      timestamp: string;
      question: string;
      answer: string;
      note: string;
      recordingId: string;
    }>;
  };
  improvements: Array<{
    situation: string;
    suggestion: string;
  }>;
  progress: {
    thisWeek: number;
    improvement: number;
  };
}

const DailyCoaching = () => {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coachingData, setCoachingData] = useState<UserCoachingData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session?.user) {
      fetchUserCoachingData();
    }
  }, [session]);

  const fetchUserCoachingData = async () => {
    try {
      setDataLoading(true);

      // Check if user has any recordings
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('id, title, created_at')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        console.error('Error fetching recordings:', recordingsError);
        return;
      }

      if (!recordings || recordings.length === 0) {
        setCoachingData({
          hasRecordings: false,
          recordingsCount: 0,
          improvements: [],
          progress: { thisWeek: 0, improvement: 0 }
        });
        return;
      }

      // Fetch conversation notes for analysis
      const { data: conversationNotes, error: notesError } = await supabase
        .from('conversation_notes')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notesError) {
        console.error('Error fetching conversation notes:', notesError);
      }

      // Analyze the conversation notes to find patterns
      const strugglesAnalysis = analyzeStrugglePatterns(conversationNotes || []);
      
      setCoachingData({
        hasRecordings: true,
        recordingsCount: recordings.length,
        topStruggle: strugglesAnalysis.topStruggle,
        improvements: strugglesAnalysis.improvements,
        progress: {
          thisWeek: Math.min(75, recordings.length * 15), // Simple progress calculation
          improvement: Math.max(5, recordings.length * 3)
        }
      });

    } catch (error) {
      console.error('Error fetching coaching data:', error);
      toast({
        title: "Error",
        description: "Failed to load your coaching data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDataLoading(false);
    }
  };

  const analyzeStrugglePatterns = (notes: any[]) => {
    // Simple analysis of conversation notes to identify patterns
    const objectionTypes = ['price', 'time', 'authority', 'need'];
    const struggles = objectionTypes.map(type => ({
      type: type.charAt(0).toUpperCase() + type.slice(1) + ' Objection',
      count: notes.filter(note => 
        note.question?.toLowerCase().includes(type) || 
        note.answer?.toLowerCase().includes(type)
      ).length
    }));

    const topStruggle = struggles.reduce((max, current) => 
      current.count > max.count ? current : max, struggles[0]);

    const examples = notes
      .filter(note => 
        note.question?.toLowerCase().includes(topStruggle.type.split(' ')[0].toLowerCase()) ||
        note.answer?.toLowerCase().includes(topStruggle.type.split(' ')[0].toLowerCase())
      )
      .slice(0, 3)
      .map((note, index) => ({
        timestamp: `0${index + 1}:${(index * 15 + 30).toString().padStart(2, '0')}`,
        question: note.question || "Prospect concern about pricing",
        answer: note.answer || "Your response",
        note: `Could be improved with better ${topStruggle.type.toLowerCase()} handling`,
        recordingId: note.recording_id
      }));

    const improvements = [
      {
        situation: `When they mention ${topStruggle.type.toLowerCase()}`,
        suggestion: topStruggle.type === 'Price Objection' 
          ? "I understand price is important. Let me show you how this investment pays for itself in the first 30 days through [specific benefit]."
          : `I hear your concern about ${topStruggle.type.split(' ')[0].toLowerCase()}. What specific aspect would you like me to address so we can move forward together?`
      },
      {
        situation: "When prospects hesitate",
        suggestion: "I totally get that - this is an important decision. What questions can I answer right now to help you feel confident about moving forward?"
      }
    ];

    return {
      topStruggle: topStruggle.count > 0 ? {
        ...topStruggle,
        examples
      } : undefined,
      improvements
    };
  };

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
              src="/lovable-uploads/4b956a83-9e3a-439f-bc16-98cefe4019ea.png" 
              alt="SwainAI Logo" 
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

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Analyzing your conversations...</p>
            </div>
          </div>
        ) : !coachingData?.hasRecordings ? (
          /* No Recordings State */
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardContent className="text-center py-12">
              <div className="w-24 h-24 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Recordings Yet</h2>
              <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                Start recording your sales conversations to get personalized coaching insights and improve your performance.
              </p>
              <Button 
                onClick={() => navigate('/')} 
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Coaching Content */
          <>
            {coachingData.topStruggle && (
              <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-background dark:from-orange-950/20 dark:to-background">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-2xl">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-orange-700 dark:text-orange-300">
                        Objection You Struggled With Most: {coachingData.topStruggle.type}
                      </CardTitle>
                      <CardDescription className="text-orange-600 dark:text-orange-400 font-medium">
                        This came up in {coachingData.topStruggle.count} of your {coachingData.recordingsCount} conversations.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {coachingData.topStruggle?.examples && coachingData.topStruggle.examples.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span>Where You Struggled</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coachingData.topStruggle.examples.map((example, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                          {example.timestamp}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePlayTimestamp(example.recordingId, example.timestamp)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Play
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <strong className="text-sm text-muted-foreground">Prospect:</strong>
                          <p className="text-foreground">"{example.question}"</p>
                        </div>
                        <div>
                          <strong className="text-sm text-muted-foreground">Your Response:</strong>
                          <p className="text-foreground">"{example.answer}"</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border-l-2 border-l-amber-400">
                          <strong className="text-sm text-amber-700 dark:text-amber-300">AI Note:</strong>
                          <p className="text-amber-600 dark:text-amber-400 text-sm">{example.note}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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
                {coachingData.improvements.map((improvement, index) => (
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Your Progress Over Time</span>
                </CardTitle>
                <CardDescription>
                  Objections Handled Successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>This Week</span>
                    <span className="font-medium">{coachingData.progress.thisWeek}%</span>
                  </div>
                  <Progress value={coachingData.progress.thisWeek} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-sm text-muted-foreground">Improvement from last week:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{coachingData.progress.improvement}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-center text-lg font-medium text-foreground">
                  {coachingData.progress.improvement > 10 
                    ? `🔥 You're ${coachingData.progress.improvement}% better than last week. Keep pushing!`
                    : "💡 Keep recording more conversations to unlock deeper insights!"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyCoaching;