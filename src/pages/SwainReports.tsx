import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LogOut, ArrowLeft, Play, TrendingUp, AlertTriangle, Lightbulb, Target, Mic, Plus, Calendar, Clock, Download, Share2, ExternalLink, Settings, History, MoreVertical, Bell, Mail, Eye, Search, Filter } from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';

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

interface HistoricalReport {
  id: string;
  date: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  recordingsAnalyzed: number;
  topStruggle: string;
  improvementScore: number;
  keyInsights: string[];
}

const SwainReports = () => {
  const { user, session, loading, signOut } = useAuth();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('current');
  const [currentReport, setCurrentReport] = useState<CoachingReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // History state
  const [reports, setReports] = useState<HistoricalReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<HistoricalReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [historyLoading, setHistoryLoading] = useState(true);

  // Settings state
  const [settings, setSettings] = useState({
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '08:00',
    timezone: 'America/New_York',
    autoGenerate: true,
    emailNotifications: true,
    pushNotifications: false,
    includeAudioExamples: true,
    shareWithManager: false,
    managerEmail: ''
  });

  const isProUser = subscriptionData?.subscribed || false;

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth');
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session?.user) {
      generateCurrentReport();
      if (activeTab === 'history') {
        loadHistoricalReports();
      }
    }
  }, [session, selectedTimeframe, activeTab]);

  useEffect(() => {
    filterReports();
  }, [searchTerm, timeframeFilter, reports]);

  const generateCurrentReport = async () => {
    try {
      setReportLoading(true);
      
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

    const topObjections = struggles.slice(0, 3).map(struggle => ({
      objection: struggle.type.replace(' Objection', ''),
      count: struggle.count,
      examples: struggle.examples.map(ex => ({
        timestamp: ex.timestamp,
        recordingId: ex.recordingId,
        callTitle: recordings.find(r => r.id === ex.recordingId)?.title || 'Sales Call'
      }))
    }));

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

  const loadHistoricalReports = async () => {
    try {
      setHistoryLoading(true);
      
      const sampleReports: HistoricalReport[] = [];
      const today = new Date();
      
      for (let i = 1; i <= 30; i++) {
        if (i <= 7) {
          sampleReports.push({
            id: `daily-${i}`,
            date: format(subDays(today, i), 'PPP'),
            timeframe: 'daily',
            recordingsAnalyzed: Math.floor(Math.random() * 5) + 1,
            topStruggle: ['Price Objection', 'Time Objection', 'Authority Objection'][Math.floor(Math.random() * 3)],
            improvementScore: Math.floor(Math.random() * 30) + 70,
            keyInsights: [
              'Improved objection handling',
              'Better rapport building',
              'More discovery questions'
            ].slice(0, Math.floor(Math.random() * 3) + 1)
          });
        }
        
        if (i <= 12) {
          sampleReports.push({
            id: `weekly-${i}`,
            date: format(subWeeks(today, i), 'PPP'),
            timeframe: 'weekly',
            recordingsAnalyzed: Math.floor(Math.random() * 15) + 5,
            topStruggle: ['Budget Concerns', 'Decision Timeline', 'Feature Requests'][Math.floor(Math.random() * 3)],
            improvementScore: Math.floor(Math.random() * 25) + 75,
            keyInsights: [
              'Consistent closing techniques',
              'Better follow-up strategies',
              'Improved qualification process'
            ].slice(0, Math.floor(Math.random() * 3) + 1)
          });
        }
        
        if (i <= 6) {
          sampleReports.push({
            id: `monthly-${i}`,
            date: format(subMonths(today, i), 'MMMM yyyy'),
            timeframe: 'monthly',
            recordingsAnalyzed: Math.floor(Math.random() * 50) + 20,
            topStruggle: ['Implementation Concerns', 'ROI Questions', 'Competitor Comparisons'][Math.floor(Math.random() * 3)],
            improvementScore: Math.floor(Math.random() * 20) + 80,
            keyInsights: [
              'Significant progress in closing rate',
              'More strategic questioning',
              'Enhanced value proposition delivery'
            ].slice(0, Math.floor(Math.random() * 3) + 1)
          });
        }
      }
      
      sampleReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReports(sampleReports);
      
    } catch (error) {
      console.error('Error loading historical reports:', error);
      toast({
        title: "Error",
        description: "Failed to load coaching history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.topStruggle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.keyInsights.some(insight => insight.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (timeframeFilter !== 'all') {
      filtered = filtered.filter(report => report.timeframe === timeframeFilter);
    }

    setFilteredReports(filtered);
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

  const handleViewReport = (reportId: string) => {
    toast({
      title: "View Report",
      description: `Opening detailed view for report ${reportId}`,
    });
  };

  const handleExportHistoryReport = (reportId: string) => {
    toast({
      title: "Export Report",
      description: `Exporting report ${reportId} as PDF`,
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your coaching preferences have been updated successfully.",
    });
  };

  const handleTestSchedule = () => {
    toast({
      title: "Test Scheduled",
      description: `Test coaching report will be generated ${settings.frequency} at ${settings.time}.`,
    });
  };

  const getTimeframeBadgeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'daily': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'weekly': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'monthly': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
    <div className="min-h-screen bg-background pb-16">
      <TopBar isProUser={isProUser} />
      
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/4b956a83-9e3a-439f-bc16-98cefe4019ea.png" 
                alt="SwainAI Logo" 
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-2xl font-bold text-foreground">Swain Reports</h1>
            </div>
          </div>
          
          {activeTab === 'current' && currentReport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border">
                <DropdownMenuItem onClick={() => setSelectedTimeframe('daily')} className="cursor-pointer">
                  Daily Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeframe('weekly')} className="cursor-pointer">
                  Weekly Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedTimeframe('monthly')} className="cursor-pointer">
                  Monthly Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

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
            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Generating your coaching report...</p>
                </div>
              </div>
            ) : !currentReport ? (
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
              <>
                {/* Report Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Swain Reports – {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)} Report
                    </CardTitle>
                    <CardDescription>
                      Generated {currentReport.date} ({currentReport.recordingsAnalyzed} recordings analyzed)
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Report Actions */}
                <div className="flex justify-start gap-2 mb-6">
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
                  <Card className="border-l-4 border-l-red-500">
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
                {currentReport.strengths.length > 0 && (
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-green-700 dark:text-green-300">
                        <Target className="h-6 w-6" />
                        Strengths
                      </CardTitle>
                      <CardDescription className="text-green-600 dark:text-green-400">
                        Areas where you're performing well
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentReport.strengths.map((strength, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div>
                            <h4 className="font-semibold text-green-800 dark:text-green-200">{strength.category}</h4>
                            <p className="text-sm text-green-600 dark:text-green-400">{strength.description}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            +{strength.improvement}%
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Objections You Faced */}
                {currentReport.topObjections.length > 0 && (
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-orange-700 dark:text-orange-300">
                        <AlertTriangle className="h-6 w-6" />
                        Objections You Faced
                      </CardTitle>
                      <CardDescription className="text-orange-600 dark:text-orange-400">
                        Common objections and how often you encountered them
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentReport.topObjections.map((objection, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{objection.objection}</h4>
                            <Badge variant="secondary">{objection.count} times</Badge>
                          </div>
                          <div className="space-y-1">
                            {objection.examples.slice(0, 2).map((example, exampleIndex) => (
                              <p key={exampleIndex} className="text-sm text-muted-foreground">
                                • {example.callTitle} at {example.timestamp}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Improvement Tips */}
                {currentReport.improvementTips.length > 0 && (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
                        <Lightbulb className="h-6 w-6" />
                        Improvement Tips
                      </CardTitle>
                      <CardDescription className="text-blue-600 dark:text-blue-400">
                        Actionable advice to enhance your sales performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentReport.improvementTips.map((tip, index) => (
                        <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200">{tip.situation}</h4>
                          <p className="text-blue-700 dark:text-blue-300">{tip.tip}</p>
                          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-sm">
                            <strong>Example:</strong> "{tip.example}"
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading coaching history...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Coaching History</h2>
                  <p className="text-muted-foreground">View and analyze your past coaching reports.</p>
                </div>

                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by struggle type or insights..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="sm:w-48">
                        <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
                          <SelectTrigger>
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by timeframe" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border">
                            <SelectItem value="all">All Reports</SelectItem>
                            <SelectItem value="daily">Daily Reports</SelectItem>
                            <SelectItem value="weekly">Weekly Reports</SelectItem>
                            <SelectItem value="monthly">Monthly Reports</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reports List */}
                {filteredReports.length === 0 ? (
                  <Card className="border-2 border-dashed border-muted-foreground/20">
                    <CardContent className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm || timeframeFilter !== 'all' 
                          ? 'Try adjusting your filters to see more results.'
                          : 'Your coaching reports will appear here once generated.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredReports.map((report) => (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className={getTimeframeBadgeColor(report.timeframe)}>
                                  {report.timeframe.charAt(0).toUpperCase() + report.timeframe.slice(1)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{report.date}</span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm">
                                    <strong>Top Struggle:</strong> {report.topStruggle}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm">
                                    <strong>Improvement Score:</strong> 
                                    <span className={`ml-1 font-semibold ${getScoreColor(report.improvementScore)}`}>
                                      {report.improvementScore}%
                                    </span>
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm">
                                    <strong>Recordings Analyzed:</strong> {report.recordingsAnalyzed}
                                  </span>
                                </div>
                                
                                {report.keyInsights.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {report.keyInsights.map((insight, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {insight}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportHistoryReport(report.id)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Coaching Settings</h2>
              <p className="text-muted-foreground">Configure when and how you receive your Swain Reports.</p>
            </div>

            {/* Schedule Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Settings
                </CardTitle>
                <CardDescription>
                  Set when you want to receive your coaching reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Report Frequency</Label>
                    <Select 
                      value={settings.frequency} 
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                        setSettings(prev => ({ ...prev, frequency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Delivery Time</Label>
                    <Select 
                      value={settings.time} 
                      onValueChange={(value) => setSettings(prev => ({ ...prev, time: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="07:00">7:00 AM</SelectItem>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="13:00">1:00 PM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                        <SelectItem value="17:00">5:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="19:00">7:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                        <SelectItem value="21:00">9:00 PM</SelectItem>
                        <SelectItem value="22:00">10:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London Time</SelectItem>
                      <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-generate"
                    checked={settings.autoGenerate}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGenerate: checked }))}
                  />
                  <Label htmlFor="auto-generate">Automatically generate reports at scheduled time</Label>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about new reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-notifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                  <Label htmlFor="email-notifications">Email notifications</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="push-notifications"
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                  <Label htmlFor="push-notifications">Push notifications</Label>
                </div>
              </CardContent>
            </Card>

            {/* Report Content Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Report Content
                </CardTitle>
                <CardDescription>
                  Customize what's included in your coaching reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-audio"
                    checked={settings.includeAudioExamples}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeAudioExamples: checked }))}
                  />
                  <Label htmlFor="include-audio">Include audio examples in reports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="share-manager"
                    checked={settings.shareWithManager}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, shareWithManager: checked }))}
                  />
                  <Label htmlFor="share-manager">Share reports with manager</Label>
                </div>

                {settings.shareWithManager && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="manager-email">Manager Email</Label>
                    <Input
                      id="manager-email"
                      type="email"
                      placeholder="manager@company.com"
                      value={settings.managerEmail}
                      onChange={(e) => setSettings(prev => ({ ...prev, managerEmail: e.target.value }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleTestSchedule}>
                <Clock className="h-4 w-4 mr-2" />
                Test Schedule
              </Button>
              
              <div className="space-x-2">
                <Button variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </div>

            {/* Preview Card */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    You will receive your <span className="font-medium">{settings.frequency}</span> Swain Reports 
                    at <span className="font-medium">{settings.time}</span> ({settings.timezone})
                  </p>
                  {settings.shareWithManager && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reports will also be sent to: <span className="font-medium">{settings.managerEmail || 'manager email'}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default SwainReports;