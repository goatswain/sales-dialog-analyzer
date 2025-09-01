import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthGuard';

interface AudioRecorderProps {
  onUploadComplete: (recordingId: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onUploadComplete }) => {
  const { session } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const startRecording = async () => {
    console.log('🎤 Start recording button clicked');
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('❌ Browser does not support getUserMedia');
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support audio recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔍 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Recording stopped and blob created');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      console.log('🎯 Recording started successfully');

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let description = "Could not access microphone. Please check permissions.";
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        description = "Microphone access denied. Please allow microphone permissions and try again.";
      } else if (errorMessage.includes('NotFoundError')) {
        description = "No microphone found. Please connect a microphone and try again.";
      }
      
      toast({
        title: "Recording Failed",
        description,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    console.log('🛑 stopRecording called, current state:', { 
      isRecording, 
      hasMediaRecorder: !!mediaRecorderRef.current,
      mediaRecorderState: mediaRecorderRef.current?.state 
    });
    
    if (mediaRecorderRef.current && isRecording) {
      console.log('✅ Stopping media recorder...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        console.log('✅ Clearing timer...');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      console.log('✅ Stop recording completed');
    } else {
      console.log('❌ Cannot stop - mediaRecorder or isRecording issue');
    }
  };

  const uploadAudio = async (audioFile: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch('https://cuabhynevjfnswaciunm.supabase.co/functions/v1/upload-audio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
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
          
          // Reset component state after successful upload and transcription start
          setRecordedBlob(null);
          setRecordingTime(0);
          
          onUploadComplete(result.recording.id);
        } catch (transcribeError) {
          console.error('💥 Transcription error:', transcribeError);
          // Still reset state even if transcription fails, and complete the upload
          setRecordedBlob(null);
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

  const startTranscription = async (recordingId: string) => {
    console.log('🎤 Starting transcription for:', recordingId);
    try {
      // Add timestamp to force function restart with new API key
      const url = `https://cuabhynevjfnswaciunm.supabase.co/functions/v1/transcribe-audio?t=${Date.now()}`;
      console.log('📡 Calling transcription URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          recordingId
        }),
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
    
    // Reset the file input so the same file can be uploaded again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRecordedUpload = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], `recording-${Date.now()}.wav`, {
        type: 'audio/wav'
      });
      uploadAudio(file);
      // Note: State will be reset in uploadAudio after successful upload
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Big Centered Record Button */}
      <Card className="w-full max-w-sm sm:max-w-lg mx-auto shadow-lg border-0 bg-gradient-to-br from-card to-accent/20">
        <CardContent className="p-4 sm:p-8">
          <div className="text-center space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-poppins font-bold text-foreground mb-2">Record Call</h2>
              <p className="text-sm text-muted-foreground font-roboto">Capture sales calls for AI analysis</p>
            </div>

            {/* Recording Controls */}
            {!recordedBlob && (
              <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                {isRecording ? (
                  <div className="text-center space-y-4">
                    <div className="text-2xl sm:text-4xl font-inter font-bold text-primary mb-4">
                      {formatTime(recordingTime)}
                    </div>
                    <div className="relative">
                      <Button 
                        onClick={(e) => {
                          console.log('🛑 STOP BUTTON CLICKED!', e);
                          e.preventDefault();
                          e.stopPropagation();
                          stopRecording();
                        }}
                        onTouchStart={(e) => {
                          console.log('📱 STOP TOUCH START!', e);
                        }}
                        variant="destructive"
                        size="lg"
                        className="rounded-full w-20 h-20 sm:w-24 sm:h-24 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative z-10"
                      >
                        <Square className="w-6 h-6 sm:w-8 sm:h-8" />
                      </Button>
                      <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse pointer-events-none"></div>
                    </div>
                    <p className="text-sm text-muted-foreground font-roboto">Recording...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <Button 
                        onClick={(e) => {
                          console.log('🔥 BUTTON CLICKED!', e);
                          e.preventDefault();
                          e.stopPropagation();
                          startRecording();
                        }}
                        onTouchStart={(e) => {
                          console.log('📱 TOUCH START!', e);
                        }}
                        size="lg"
                        className="rounded-full w-20 h-20 sm:w-24 sm:h-24 bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative z-10"
                        disabled={isUploading}
                      >
                        <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
                      </Button>
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse pointer-events-none"></div>
                    </div>
                    <p className="text-sm text-muted-foreground font-roboto">Tap to record</p>
                  </div>
                )}
              </div>
            )}

            {/* Recorded Audio Preview */}
            {recordedBlob && (
              <div className="text-center space-y-4">
                <div className="text-lg font-poppins font-semibold text-foreground">Recording Complete</div>
                <div className="text-muted-foreground font-roboto text-sm">Duration: {formatTime(recordingTime)}</div>
                <audio 
                  controls 
                  src={URL.createObjectURL(recordedBlob)}
                  className="w-full rounded-lg"
                />
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button 
                    onClick={handleRecordedUpload}
                    disabled={isUploading}
                    className="flex-1 bg-secondary hover:bg-secondary/90"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordingTime(0);
                    }}
                    variant="outline"
                    className="sm:w-auto"
                  >
                    Re-record
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload File Card */}
      {!isRecording && !recordedBlob && (
        <Card className="w-full max-w-sm sm:max-w-lg mx-auto shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-poppins font-semibold text-foreground mb-1 text-sm sm:text-base">Upload Audio</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-roboto">
                  {isUploading ? 'Processing...' : 'Select existing recording'}
                </p>
              </div>
              {isUploading && (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">Uploading...</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground font-roboto">
                MP3, WAV, M4A • Max 100MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioRecorder;