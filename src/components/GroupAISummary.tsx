import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronRight, Zap, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import { sanitizeHtml, sanitizeInput } from '@/utils/sanitize';

interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

interface Transcript {
  text: string;
  segments?: Segment[];
}

interface Analysis {
  answer: string;
  summary: string;
  objections?: string[];
  improvements?: string[];
  key_moments?: Array<{
    timestamp: string;
    description: string;
  }>;
}

interface GroupAISummaryProps {
  recordingId: string;
  duration: number;
  autoGenerate?: boolean;
}

export const GroupAISummary: React.FC<GroupAISummaryProps> = ({
  recordingId,
  duration,
  autoGenerate = false,
}) => {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { toast } = useToast();

  const shouldAutoGenerate = autoGenerate; // Always generate if autoGenerate is true

  React.useEffect(() => {
    if (shouldAutoGenerate && !hasGenerated) {
      generateSummary();
    }
  }, [shouldAutoGenerate, hasGenerated]);

  const generateSummary = async () => {
    if (loading || hasGenerated) return;
    
    setLoading(true);
    try {
      // First check if we already have saved analysis
      const { data: existingAnalysis } = await supabase
        .from('conversation_notes')
        .select('*')
        .eq('recording_id', recordingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAnalysis) {
        // Use existing saved analysis
        try {
          const analysisData = JSON.parse(existingAnalysis.answer);
          setAnalysis(analysisData);
        } catch (parseError) {
          // If parsing fails, treat as plain text
          setAnalysis({
            answer: existingAnalysis.answer,
            summary: existingAnalysis.answer,
          });
        }
      }

      // Check if transcript already exists
      const { data: existingTranscript } = await supabase
        .from('transcripts')
        .select('*')
        .eq('recording_id', recordingId)
        .single();

      let transcriptData = existingTranscript;

      if (!existingTranscript) {
        // Get API key from localStorage for transcription
        const apiKey = localStorage.getItem('openai-api-key')
        if (!apiKey) {
          toast({
            title: "API Key Required",
            description: "Please add your OpenAI API key in Settings to enable transcription.",
            variant: "destructive",
          })
          return
        }

        // Trigger transcription
        const { error: transcribeError } = await supabase.functions.invoke('transcribe-audio-v2', {
          body: { recordingId, apiKey }
        });

        if (transcribeError) {
          throw new Error(`Transcription failed: ${transcribeError.message}`);
        }

        // Wait a bit and try to fetch transcript
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: newTranscript } = await supabase
          .from('transcripts')
          .select('*')
          .eq('recording_id', recordingId)
          .single();

        transcriptData = newTranscript;
      }

      if (transcriptData) {
        setTranscript({
          text: transcriptData.text,
          segments: Array.isArray(transcriptData.segments) ? transcriptData.segments as unknown as Segment[] : []
        });

        // Only generate AI analysis if we don't have existing saved analysis
        if (!existingAnalysis) {
          // Get API key from localStorage
          const apiKey = localStorage.getItem('openai-api-key')
          if (!apiKey) {
            toast({
              title: "API Key Required",
              description: "Please add your OpenAI API key in Settings to enable AI analysis.",
              variant: "destructive",
            })
            return
          }

          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-conversation', {
            body: {
              recordingId,
              question: 'Please provide a concise summary highlighting key points, objections raised, responses given, and improvement tips for this conversation.',
              apiKey
            }
          });

          if (analysisError) {
            throw new Error(`Analysis failed: ${analysisError.message}`);
          }

          if (analysisData?.analysis) {
            setAnalysis(analysisData.analysis);
          }
        }
      }

      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (shouldAutoGenerate && !hasGenerated && !loading) {
    return null; // Will auto-generate on mount
  }

  if (!shouldAutoGenerate && !hasGenerated) {
    return (
      <div className="mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={generateSummary}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {loading ? 'Generating...' : 'Generate AI Summary'}
        </Button>
      </div>
    );
  }

  if (loading && !transcript && !analysis) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating AI summary...
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Transcript */}
      {transcript && (
        <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-auto p-2">
              {transcriptOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <FileText className="h-3 w-3" />
              <span className="text-xs">📜 Transcript (expand)</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="p-3 bg-muted/30">
              <div className="text-xs space-y-2">
                 {transcript.segments && transcript.segments.length > 0 ? (
                   transcript.segments.map((segment, index) => (
                     <div key={index} className="flex gap-2 mb-1">
                       <span className="text-muted-foreground font-mono min-w-[45px]">
                         {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(0).padStart(2, '0')}
                       </span>
                       <span className="font-medium text-primary min-w-[70px]">
                         {segment.speaker || `Speaker ${(index % 2) + 1}`}:
                       </span>
                       <span className="text-foreground">{sanitizeInput(segment.text)}</span>
                     </div>
                   ))
                 ) : (
                   <p className="text-foreground">{sanitizeInput(transcript.text)}</p>
                 )}
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* AI Summary */}
      {analysis && (
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-auto p-2">
              {summaryOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-xs">✨ Summary (expand)</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="space-y-3">
                {analysis.summary && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Overview:</h4>
                    <p className="text-sm text-foreground">{sanitizeInput(analysis.summary)}</p>
                  </div>
                )}

                {analysis.objections && analysis.objections.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Key Objections:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.objections.map((objection, index) => (
                        <li key={index} className="text-foreground">• {sanitizeInput(objection)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.improvements && analysis.improvements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Improvement Tips:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.improvements.map((tip, index) => (
                        <li key={index} className="text-foreground">• {sanitizeInput(tip)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.key_moments && analysis.key_moments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Key Moments:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.key_moments.map((moment, index) => (
                        <li key={index} className="text-foreground">
                          <span className="font-mono text-xs text-muted-foreground">{moment.timestamp}</span>
                          {' - '}{sanitizeInput(moment.description)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};