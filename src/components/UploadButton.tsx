import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthGuard';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UploadButtonProps {
  onUploadComplete: (recordingId: string) => void;
  session?: Session | null;
}

const UploadButton: React.FC<UploadButtonProps> = ({ onUploadComplete, session: propSession }) => {
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          onUploadComplete(result.recording.id);
        } catch (transcribeError) {
          console.error('Transcription error:', transcribeError);
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

      console.log('🎤 Calling transcription with body:', requestBody)
      
      // Use direct fetch to get better error handling
      const response = await fetch(`https://cuabhynevjfnswaciunm.supabase.co/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1YWJoeW5ldmpmbnN3YWNpdW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTYwMjYsImV4cCI6MjA3MTkzMjAyNn0.waKYoAMsVSeLZ7Xtlt5O2XWm5qtLHvp8FDjqSiXysRc',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('🎤 Transcription response:', { status: response.status, result })

      if (!response.ok) {
        console.log('🎤 Transcription failed with status:', response.status)
        console.log('🎤 Error result:', result)
        
        // Check if it's an API key error using the actual response
        if (result.needsApiKey || (result.error && result.error.includes('OpenAI API key'))) {
          console.log('🎤 Detected API key error, showing prompt...')
          
          // Force the prompt to show immediately
          setTimeout(() => {
            const userApiKey = prompt('❌ OpenAI API key is missing!\n\nPlease enter your OpenAI API key to enable transcription:')
            if (userApiKey && userApiKey.trim()) {
              console.log('🎤 User provided API key, retrying...')
              // Retry with user-provided API key
              startTranscription(recordingId, userApiKey.trim()).catch(console.error)
            } else {
              console.log('🎤 User cancelled or provided empty key')
              toast({
                title: "API Key Required",
                description: "OpenAI API key is required for transcription",
                variant: "destructive",
              });
            }
          }, 100)
          
          return // Don't throw error, we're handling it with the prompt
        }
        
        throw new Error(result.error || `Transcription failed with status ${response.status}`);
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

  return (
    <div className="flex flex-col items-center">
      <Button
        variant="outline"
        size="lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-48 h-12 border-dashed border-2 hover:bg-accent/50"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 mr-2" />
            Upload Call
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground mt-2">
        MP3, WAV, M4A • Max 100MB
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.m4a,audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default UploadButton;