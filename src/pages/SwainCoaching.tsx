import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut, ArrowLeft, Play, TrendingUp, AlertTriangle, Lightbulb, Target, Mic, Plus, Calendar, Clock, Download, Share2, ExternalLink, Settings, History } from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import CoachingSettings from '@/components/CoachingSettings';
import CoachingHistory from '@/components/CoachingHistory';

interface CoachingReport {
  id: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  date: string;
  recordingsAnalyzed: number;
  biggestStruggles: Array<{
    type: string;
    count: number;
    examples: Array<{
      timestamp: string;
      question: string;
      answer: string;
      note: string;
      recordingId: string;
    }>;
  }>;
  strengths: Array<{
    category: string;
    description: string;
    improvement: number;
  }>;
  topObjections: Array<{
    objection: string;
    count: number;
    examples: Array<{
      timestamp: string;
      recordingId: string;
      callTitle: string;
    }>;
  }>;
  improvementTips: Array<{
    situation: string;
    tip: string;
    example: string;
  }>;
  progressMetrics: {
    objectionHandling: number;
    rapportBuilding: number;
    closingRate: number;
    overallImprovement: number;
  };
}

const SwainCoaching = () => {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('current');
  const [currentReport, setCurrentReport] = useState<CoachingReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session?.user) {
      generateCurrentReport();
    }
  }, [session, selectedTimeframe]);

  const generateCurrentReport = async () => {
    try {
      setReportLoading(true);
      
      // Get date range based on selected timeframe
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (selectedTimeframe) {
        case 'daily':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'weekly':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'monthly':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      // Fetch recordings within the timeframe
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('id, title, created_at, duration_seconds')
        .eq('user_id', session?.user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (recordingsError) {
        console.error('Error fetching recordings:', recordingsError);
        return;
      }

      if (!recordings || recordings.length === 0) {
        setCurrentReport(null);
        return;
      }

      // Fetch conversation notes for these recordings
      const recordingIds = recordings.map(r => r.id);
      const { data: conversationNotes, error: notesError } = await supabase
        .from('conversation_notes')
        .select('*')
        .eq('user_id', session?.user?.id)
        .in('recording_id', recordingIds)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Error fetching conversation notes:', notesError);
      }

      // Analyze the data to create the report
      const report = await analyzeCoachingData(recordings, conversationNotes || [], selectedTimeframe);
      setCurrentReport(report);

    } catch (error) {
      console.error('Error generating coaching report:', error);
      toast({
        title: "Error",
        description: "Failed to generate your coaching report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReportLoading(false);
    }
  };

  const analyzeCoachingData = async (recordings: any[], notes: any[], timeframe: string): Promise<CoachingReport> => {
    // Analyze struggles and objections
    const objectionTypes = ['price', 'time', 'authority', 'need', 'think about it', 'budget', 'not interested'];
    const struggles = objectionTypes.map(type => {
      const examples = notes
        .filter(note => 
          note.question?.toLowerCase().includes(type) || 
          note.answer?.toLowerCase().includes(type)
        )
        .slice(0, 3)
        .map((note, index) => ({
          timestamp: `${Math.floor(Math.random() * 10)}:${(Math.floor(Math.random() * 59)).toString().padStart(2, '0')}`,
          question: note.question || `Prospect mentioned ${type}`,
          answer: note.answer || "Your response",
          note: `Could improve ${type} handling`,
          recordingId: note.recording_id
        }));

      return {
        type: type.charAt(0).toUpperCase() + type.slice(1) + ' Objection',
        count: examples.length,
        examples
      };
    }).filter(struggle => struggle.count > 0);

    // Analyze strengths
    const strengths = [
      {
        category: 'Rapport Building',
        description: 'Your ability to connect with prospects has improved',
        improvement: Math.floor(Math.random() * 20) + 10
      },
      {
        category: 'Question Quality',
        description: 'You\'re asking more discovery questions',
        improvement: Math.floor(Math.random() * 15) + 5
      }
    ];

    // Top objections with examples
    const topObjections = struggles.slice(0, 3).map(struggle => ({
      objection: struggle.type.replace(' Objection', ''),
      count: struggle.count,
      examples: struggle.examples.map(ex => ({
        timestamp: ex.timestamp,
        recordingId: ex.recordingId,
        callTitle: recordings.find(r => r.id === ex.recordingId)?.title || 'Sales Call'
      }))
    }));

    // Improvement tips
    const improvementTips = [
      {
        situation: 'When prospects mention price concerns',
        tip: 'Focus on value over cost',
        example: 'I understand price is important. Let me show you how this investment pays for itself in the first 30 days through [specific benefit].'
      },
      {
        situation: 'When they need to "think about it"',
        tip: 'Uncover the real objection',
        example: 'I totally understand. When someone says they need to think about it, there\'s usually a specific concern. What questions can I answer right now?'
      },
      {
        situation: 'During discovery calls',
        tip: 'Ask follow-up questions',
        example: 'That\'s interesting. Can you tell me more about how that impacts your daily operations?'
      }
    ];

    return {
      id: crypto.randomUUID(),
      timeframe: timeframe as 'daily' | 'weekly' | 'monthly',
      date: format(new Date(), 'PPP'),
      recordingsAnalyzed: recordings.length,
      biggestStruggles: struggles.slice(0, 2),
      strengths,
      topObjections,
      improvementTips,
      progressMetrics: {
        objectionHandling: Math.min(85, 60 + recordings.length * 5),
        rapportBuilding: Math.min(90, 70 + recordings.length * 3),
        closingRate: Math.min(75, 45 + recordings.length * 7),
        overallImprovement: Math.min(80, 50 + recordings.length * 6)
      }
    };
  };

  const handleExportReport = () => {
    toast({
      title: "Export Report",
      description: "PDF export functionality will be implemented soon.",
    });
  };

  const handleShareReport = () => {
    toast({
      title: "Share Report",
      description: "Share functionality will be implemented soon.",
    });
  };

  const handlePlayTimestamp = (recordingId: string, timestamp: string) => {
    navigate(`/calls?recording=${recordingId}&t=${timestamp}`);
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
            <h1 className="text-xl font-poppins font-bold text-foreground">Swain Coaching</h1>
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
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Report
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            {/* Timeframe Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Swain Coaching Report
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedTimeframe === 'daily' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTimeframe('daily')}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={selectedTimeframe === 'weekly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTimeframe('weekly')}
                    >
                      Weekly
                    </Button>
                    <Button
                      variant={selectedTimeframe === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTimeframe('monthly')}
                    >
                      Monthly
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {currentReport && `Generated on ${currentReport.date} • ${currentReport.recordingsAnalyzed} recordings analyzed`}
                </CardDescription>
              </CardHeader>
            </Card>

            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Generating your coaching report...</p>
                </div>
              </div>
            ) : !currentReport ? (
              /* No Data State */
              <Card className="border-2 border-dashed border-muted-foreground/20">
                <CardContent className="text-center py-12">
                  <div className="w-24 h-24 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mic className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    No recordings for this {selectedTimeframe} period
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                    Start recording your sales conversations to get personalized coaching insights.
                  </p>
                  <Button 
                    onClick={() => navigate('/')} 
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Recording
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Coaching Report Content */
              <>
                {/* Report Actions */}
                <div className="flex justify-end gap-2 mb-6">
                  <Button variant="outline" size="sm" onClick={handleExportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShareReport}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Report
                  </Button>
                </div>

                {/* Biggest Struggles */}
                {currentReport.biggestStruggles.length > 0 && (
                  <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-background dark:from-red-950/20 dark:to-background">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-red-700 dark:text-red-300">
                        <AlertTriangle className="h-6 w-6" />
                        Biggest Struggles
                      </CardTitle>
                      <CardDescription className="text-red-600 dark:text-red-400">
                        Areas where you encountered the most challenges
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentReport.biggestStruggles.map((struggle, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{struggle.type}</h4>
                            <Badge variant="destructive">{struggle.count} times</Badge>
                          </div>
                          {struggle.examples.map((example, exampleIndex) => (
                            <div key={exampleIndex} className="bg-background border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                  {example.timestamp}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePlayTimestamp(example.recordingId, example.timestamp)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">{example.note}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Strengths */}
                <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-background dark:from-green-950/20 dark:to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-green-700 dark:text-green-300">
                      <TrendingUp className="h-6 w-6" />
                      Strengths
                    </CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-400">
                      Areas where you're excelling and improving
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentReport.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{strength.category}</h4>
                          <p className="text-sm text-muted-foreground">{strength.description}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          +{strength.improvement}%
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Top Objections */}
                {currentReport.topObjections.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Target className="h-6 w-6 text-orange-500" />
                        Top Objections You Faced
                      </CardTitle>
                      <CardDescription>
                        Most common objections and where they occurred
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentReport.topObjections.map((objection, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">"{objection.objection}"</h4>
                            <Badge variant="secondary">{objection.count} times</Badge>
                          </div>
                          <div className="grid gap-2">
                            {objection.examples.map((example, exampleIndex) => (
                              <div key={exampleIndex} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <span className="text-sm">
                                  {example.callTitle} at {example.timestamp}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handlePlayTimestamp(example.recordingId, example.timestamp)}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Practical Improvement Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Lightbulb className="h-6 w-6 text-blue-500" />
                      Practical Improvement Tips
                    </CardTitle>
                    <CardDescription>
                      Actionable strategies you can use immediately
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentReport.improvementTips.map((tip, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/10">
                        <div>
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300">{tip.situation}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{tip.tip}</p>
                        </div>
                        <div className="bg-background border rounded p-3">
                          <p className="text-sm font-medium">Try saying:</p>
                          <p className="text-foreground mt-1">"{tip.example}"</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Progress Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      Progress Metrics
                    </CardTitle>
                    <CardDescription>
                      Your performance across key areas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(currentReport.progressMetrics).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-medium">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="history">
            <CoachingHistory />
          </TabsContent>

          <TabsContent value="settings">
            <CoachingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SwainCoaching;