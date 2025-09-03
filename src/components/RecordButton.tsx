import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthGuard';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface RecordButtonProps {
  onUploadComplete: (recordingId: string) => void;
  session?: Session | null;
}

const RecordButton: React.FC<RecordButtonProps> = ({ onUploadComplete, session: propSession }) => {
  // Try to use AuthGuard context first, fall back to props
  let authSession: Session | null = null;
  
  try {
    const auth = useAuth();
    authSession = auth.session;
  } catch (error) {
    // Not within AuthGuard context, use props instead
    authSession = propSession || null;
  }
  
  const session = authSession;
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support audio recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());
        
        const file = new File([blob], `recording-${Date.now()}.wav`, {
          type: 'audio/wav'
        });
        
        await uploadAudio(file);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async (audioFile: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const { data: result, error } = await supabase.functions.invoke('upload-audio', {
        body: formData,
      });

      if (error) {
        throw error;
      }
      
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: "Starting transcription...",
        });
        
        try {
          await startTranscription(result.recording.id);
          setRecordingTime(0);
          onUploadComplete(result.recording.id);
        } catch (transcribeError) {
          console.error('Transcription error:', transcribeError);
          setRecordingTime(0);
          onUploadComplete(result.recording.id);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const startTranscription = async (recordingId: string, apiKey?: string) => {
    try {
      const requestBody: any = { recordingId }
      
      // If we have an API key, include it in the request
      if (apiKey) {
        requestBody.openaiApiKey = apiKey
      }

      const { data: result, error } = await supabase.functions.invoke('transcribe-audio', {
        body: requestBody,
      });

      if (error) {
        // Check if it's an API key error
        if (error.message?.includes('OpenAI API key required')) {
          // Prompt user for API key
          const userApiKey = prompt('Please enter your OpenAI API key to enable transcription:')
          if (userApiKey) {
            // Retry with user-provided API key
            return startTranscription(recordingId, userApiKey.trim())
          }
        }
        throw new Error(error.message || 'Transcription failed');
      }
      
      if (result.success) {
        toast({
          title: "Transcription Started",
          description: "Your audio is being transcribed in the background...",
        });
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast({
        title: "Transcription Failed",
        description: "Could not start transcription. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Processing...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {isRecording ? (
        <>
          <div className="text-4xl font-inter font-bold text-primary mb-4">
            {formatTime(recordingTime)}
          </div>
          <div className="relative">
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="rounded-full w-32 h-32 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Square className="w-12 h-12" />
            </Button>
            <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse pointer-events-none"></div>
          </div>
          <p className="text-sm text-muted-foreground">Recording...</p>
        </>
      ) : (
        <>
          <div className="relative">
            <Button 
              onClick={startRecording}
              size="lg"
              className="rounded-full w-32 h-32 bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Mic className="w-12 h-12" />
            </Button>
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse pointer-events-none"></div>
          </div>
          <p className="text-lg font-medium text-foreground">Tap to Record</p>
        </>
      )}
    </div>
  );
};

export default RecordButton;