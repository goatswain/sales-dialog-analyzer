import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Copy, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AudioPlayer from '@/components/AudioPlayer';

interface Segment {
  start_time: number;
  end_time: number;
  text: string;
  speaker: string;
}

interface Transcript {
  id: string;
  text: string;
  segments: Segment[];
}

interface Recording {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  duration_seconds?: number;
}

interface Analysis {
  summary: string;
  objections: string[];
  improvements: string[];
  timestamps: Array<{
    time: string;
    text: string;
    context: string;
  }>;
  followUpTemplates: string[];
  answer: string;
}

interface TranscriptViewerProps {
  recordingId: string;
  onBack: () => void;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ recordingId, onBack }) => {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordingData();
  }, [recordingId]);

  const fetchRecordingData = async () => {
    console.log('TranscriptViewer: Fetching recording data for ID:', recordingId);
    try {
      // Fetch recording and transcript data
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          title,
          audio_url,
          created_at,
          duration_seconds,
          transcripts (
            id,
            text,
            segments
          )
        `)
        .eq('id', recordingId)
        .single();

      if (error) {
        console.error('TranscriptViewer: Error fetching recording:', error);
        return;
      }

      console.log('TranscriptViewer: Fetched recording data:', data);
      setRecording(data);
      if (data.transcripts && data.transcripts[0]) {
        const transcriptData = data.transcripts[0];
        console.log('TranscriptViewer: Setting transcript data:', transcriptData);
        setTranscript({
          ...transcriptData,
          segments: Array.isArray(transcriptData.segments) ? (transcriptData.segments as unknown as Segment[]) : []
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          recordingId: recordingId,
          question: question.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }

      if (data?.success) {
        setAnalysis(data.analysis);
        setQuestion('');
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimestampClick = (timeInSeconds: number) => {
    // This will be handled by the AudioPlayer component through its seek functionality
    console.log('Timestamp clicked:', timeInSeconds);
  };

  // Remove the old play/pause handler since AudioPlayer handles this
  // const handlePlayPause = () => { ... }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
    });
  };

  const suggestedQuestions = [
    "What were the main objections raised?",
    "How can I improve my sales approach?",
    "What follow-up actions should I take?",
    "Summarize the key points of this conversation",
    "What was the customer's main concern?",
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading transcript...
        </CardContent>
      </Card>
    );
  }

  if (!recording || !transcript) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Recording or transcript not found.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recordings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <CardTitle>{recording.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(recording.created_at).toLocaleDateString()} • 
                {recording.duration_seconds ? ` ${formatTime(recording.duration_seconds)}` : ' Unknown duration'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transcript Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Audio Player */}
            <div className="mb-4">
              <AudioPlayer
                audioUrl={recording.audio_url}
                title={recording.title}
                duration={recording.duration_seconds}
                className="bg-muted/50"
              />
            </div>

            {/* Transcript Content */}
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {transcript.segments && transcript.segments.length > 0 ? (
                  transcript.segments.map((segment, index) => (
                    <div key={index} className="group">
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-mono opacity-60 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleTimestampClick(segment.start_time)}
                        >
                          {formatTime(segment.start_time)}
                        </Button>
                        <div className="flex-1">
                          <Badge variant="outline" className="text-xs mb-1">
                            {segment.speaker}
                          </Badge>
                          <p className="text-sm">{segment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground mb-2">No segmented transcript available</p>
                    <p className="text-sm">{transcript.text}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Analysis Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ask about this conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question Input */}
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about this conversation?"
                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                disabled={isAnalyzing}
              />
              <Button 
                onClick={handleAskQuestion} 
                disabled={isAnalyzing || !question.trim()}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested questions:</p>
              <div className="grid gap-2">
                {suggestedQuestions.map((suggestedQ, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-2"
                    onClick={() => setQuestion(suggestedQ)}
                    disabled={isAnalyzing}
                  >
                    {suggestedQ}
                  </Button>
                ))}
              </div>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-4 border-t pt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {/* Answer */}
                    <div>
                      <h4 className="font-semibold mb-2">Answer</h4>
                      <p className="text-sm">{analysis.answer}</p>
                    </div>

                    {/* Summary */}
                    {analysis.summary && (
                      <div>
                        <h4 className="font-semibold mb-2">Summary</h4>
                        <p className="text-sm">{analysis.summary}</p>
                      </div>
                    )}

                    {/* Objections */}
                    {analysis.objections && analysis.objections.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Objections</h4>
                        <ul className="text-sm space-y-1">
                          {analysis.objections.map((objection, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              {objection}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {analysis.improvements && analysis.improvements.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Improvement Suggestions</h4>
                        <ul className="text-sm space-y-1">
                          {analysis.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{index + 1}.</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Timestamps */}
                    {analysis.timestamps && analysis.timestamps.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Moments</h4>
                        <div className="space-y-2">
                          {analysis.timestamps.map((timestamp, index) => (
                            <div key={index} className="text-sm border rounded p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs font-mono mb-1"
                                onClick={() => {
                                  const [mins, secs] = timestamp.time.split(':').map(Number);
                                  handleTimestampClick(mins * 60 + secs);
                                }}
                              >
                                {timestamp.time}
                              </Button>
                              <p className="font-medium">{timestamp.context}</p>
                              <p className="text-muted-foreground">"{timestamp.text}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Templates */}
                    {analysis.followUpTemplates && analysis.followUpTemplates.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Follow-up Messages</h4>
                        <div className="space-y-2">
                          {analysis.followUpTemplates.map((template, index) => (
                            <div key={index} className="text-sm border rounded p-2">
                              <p className="mb-2">{template}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(template)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TranscriptViewer;