import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  onUploadComplete: (recordingId: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onUploadComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
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

      const response = await fetch('https://cuabhynevjfnswaciunm.supabase.co/functions/v1/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('📤 Upload result:', result);
      
      if (result.success) {
        console.log('✅ Upload successful, starting transcription...');
        toast({
          title: "Upload Successful",
          description: "Starting transcription...",
        });
        
        try {
          // Start transcription
          console.log('🎯 About to call startTranscription with ID:', result.recording.id);
          await startTranscription(result.recording.id);
          console.log('✅ Transcription call completed');
          onUploadComplete(result.recording.id);
        } catch (transcribeError) {
          console.error('💥 Transcription error:', transcribeError);
          // Don't throw - still complete the upload
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

  const startTranscription = async (recordingId: string) => {
    console.log('🎤 Starting transcription for:', recordingId);
    try {
      // Add timestamp to force function restart with new API key
      const url = `https://cuabhynevjfnswaciunm.supabase.co/functions/v1/transcribe-audio?t=${Date.now()}`;
      console.log('📡 Calling transcription URL:', url);
      
        // Test API key availability first
        const keyCheckResponse = await fetch('https://cuabhynevjfnswaciunm.supabase.co/functions/v1/check-api-key');
        const keyCheck = await keyCheckResponse.json();
        console.log('🔑 API Key Check:', keyCheck);
        
        if (!keyCheck.hasApiKey) {
          throw new Error('OpenAI API key not available in edge function environment');
        }

        const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordingId }),
      });

      console.log('📊 Transcription response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Transcription response error:', errorData);
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      console.log('✅ Transcription result:', result);
      
      if (result.success) {
        toast({
          title: "Transcription Started",
          description: "Your audio is being transcribed in the background...",
        });
      }
    } catch (error) {
      console.error('💥 Transcription failed:', error);
      toast({
        title: "Transcription Failed",
        description: error.message || "Could not start transcription. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload MP3, WAV, or M4A files only.",
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Please upload files smaller than 100MB.",
          variant: "destructive",
        });
        return;
      }

      uploadAudio(file);
    }
  };

  const handleRecordedUpload = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], `recording-${Date.now()}.wav`, {
        type: 'audio/wav'
      });
      uploadAudio(file);
      setRecordedBlob(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sales Recorder</h2>
          <p className="text-muted-foreground">Record or upload your sales conversation</p>
        </div>

        {/* Recording Controls */}
        {!recordedBlob && (
          <div className="flex flex-col items-center space-y-4">
            {isRecording ? (
              <div className="text-center">
                <div className="text-3xl font-mono text-primary mb-2">
                  {formatTime(recordingTime)}
                </div>
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-16 h-16"
                >
                  <Square className="w-6 h-6" />
                </Button>
                <p className="text-sm text-muted-foreground mt-2">Click to stop recording</p>
              </div>
            ) : (
              <div className="text-center">
                <Button 
                  onClick={startRecording}
                  variant="default"
                  size="lg"
                  className="rounded-full w-16 h-16 mb-2"
                  disabled={isUploading}
                >
                  <Mic className="w-6 h-6" />
                </Button>
                <p className="text-sm text-muted-foreground">Click to start recording</p>
              </div>
            )}
          </div>
        )}

        {/* Recorded Audio Preview */}
        {recordedBlob && (
          <div className="text-center space-y-3">
            <div className="text-lg font-semibold">Recording Complete</div>
            <div className="text-muted-foreground">Duration: {formatTime(recordingTime)}</div>
            <audio 
              controls 
              src={URL.createObjectURL(recordedBlob)}
              className="w-full"
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleRecordedUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Transcribe
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  setRecordedBlob(null);
                  setRecordingTime(0);
                }}
                variant="outline"
              >
                Re-record
              </Button>
            </div>
          </div>
        )}

        {/* File Upload */}
        {!isRecording && !recordedBlob && (
          <div className="text-center">
            <div className="border-2 border-dashed border-muted rounded-lg p-6">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Or upload an audio file</p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Choose File'
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports MP3, WAV, M4A (max 100MB)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;