import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Download, Search, Filter, TrendingUp, AlertTriangle, Target, Eye } from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

interface HistoricalReport {
  id: string;
  date: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  recordingsAnalyzed: number;
  topStruggle: string;
  improvementScore: number;
  keyInsights: string[];
}

const CoachingHistory = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<HistoricalReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<HistoricalReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoricalReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchTerm, timeframeFilter, reports]);

  const loadHistoricalReports = async () => {
    try {
      setLoading(true);
      
      // Generate sample historical data
      const sampleReports: HistoricalReport[] = [];
      const today = new Date();
      
      // Generate reports for the last 30 days, weeks, and months
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
      
      // Sort by date (most recent first)
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
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.topStruggle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.keyInsights.some(insight => insight.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by timeframe
    if (timeframeFilter !== 'all') {
      filtered = filtered.filter(report => report.timeframe === timeframeFilter);
    }

    setFilteredReports(filtered);
  };

  const handleViewReport = (reportId: string) => {
    toast({
      title: "View Report",
      description: `Opening detailed view for report ${reportId}`,
    });
  };

  const handleExportReport = (reportId: string) => {
    toast({
      title: "Export Report",
      description: `Exporting report ${reportId} as PDF`,
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading coaching history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <SelectContent>
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
                      onClick={() => handleExportReport(report.id)}
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

      {/* Stats Summary */}
      {filteredReports.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredReports.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Reports</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(filteredReports.reduce((sum, r) => sum + r.recordingsAnalyzed, 0) / filteredReports.length)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Recordings</div>
              </div>
              
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(Math.round(filteredReports.reduce((sum, r) => sum + r.improvementScore, 0) / filteredReports.length))}`}>
                  {Math.round(filteredReports.reduce((sum, r) => sum + r.improvementScore, 0) / filteredReports.length)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {[...new Set(filteredReports.map(r => r.topStruggle))].length}
                </div>
                <div className="text-sm text-muted-foreground">Unique Struggles</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoachingHistory;