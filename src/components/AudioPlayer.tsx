import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  duration?: number;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  compact?: boolean;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  duration,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded,
  compact = false,
  className = ""
}) => {
  console.log('AudioPlayer: Component rendered with props:', { audioUrl, title, duration, compact });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      console.log('AudioPlayer: Missing audio element or URL:', { hasAudio: !!audio, audioUrl });
      return;
    }

    console.log('AudioPlayer: Setting up audio element with URL:', audioUrl);

    // Simple configuration - remove problematic settings
    audio.preload = 'metadata';
    
    // Mobile-specific attributes for better compatibility
    if (isMobile) {
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
    }
    
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };
    
    const handleError = (e: any) => {
      console.error('Audio error details:', {
        error: e,
        audioUrl,
        audioSrc: audio?.src,
        readyState: audio?.readyState,
        networkState: audio?.networkState,
        errorCode: e.target?.error?.code,
        errorMessage: e.target?.error?.message
      });
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: 'Audio Error',
        description: `Failed to load audio: ${audioUrl}. Please check your connection and try again.`,
        variant: 'destructive'
      });
    };

    // Event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Set volume
    audio.volume = volume;

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, volume, onPlay, onPause, onEnded, toast]);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      handlePlayPause();
    }
  }, [autoPlay]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      console.error('AudioPlayer: Missing audio element or URL');
      return;
    }

    console.log('AudioPlayer: Attempting to play/pause:', { isPlaying, audioUrl, readyState: audio.readyState });

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        setIsLoading(true);
        
        // Reset and reload if needed
        if (audio.readyState === 0) {
          console.log('AudioPlayer: Reloading audio...');
          audio.load();
          
          // Wait for canplay event
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Load timeout')), 10000);
            
            const onCanPlay = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e: any) => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(e);
            };
            
            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);
          });
        }
        
        await audio.play();
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('AudioPlayer: Play/pause error:', error);
      setIsLoading(false);
      
      let description = 'Unable to play audio. Please check your connection and try again.';
      if (error.name === 'NotAllowedError') {
        description = isMobile 
          ? 'Tap the play button to start audio playback on mobile devices.' 
          : 'Click the play button to start audio playback.';
      } else if (error.name === 'NotSupportedError') {
        description = 'This audio format is not supported by your browser.';
      }
      
      toast({
        title: 'Playback Error',
        description,
        variant: 'destructive'
      });
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;
    
    const newTime = (value[0] / 100) * audioDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <audio 
          ref={audioRef} 
          src={audioUrl}
          playsInline
          preload="metadata"
          onLoadStart={() => console.log('Audio load started for:', audioUrl)}
          onCanPlay={() => console.log('Audio can play for:', audioUrl)}
          onError={(e) => console.error('Audio element error:', e, 'URL:', audioUrl)}
        />
        <Button
          variant="ghost"
          size={isMobile ? "default" : "sm"}
          onClick={handlePlayPause}
          disabled={isLoading}
          className={isMobile ? "h-9 w-9 p-0" : "h-8 w-8 p-0"}
        >
          {isLoading ? (
            <Loader2 className={`${isMobile ? "w-5 h-5" : "w-4 h-4"} animate-spin`} />
          ) : isPlaying ? (
            <Pause className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
          ) : (
            <Play className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
          )}
        </Button>
        
        <div className="flex-1 min-w-0">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className={`cursor-pointer ${isMobile ? 'h-6' : ''}`}
            disabled={isLoading || audioDuration === 0}
          />
        </div>
        
        <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground font-mono whitespace-nowrap`}>
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className={isMobile ? "p-3" : "p-4"}>
        <audio 
          ref={audioRef} 
          src={audioUrl}
          playsInline
          preload="metadata"
          onLoadStart={() => console.log('Audio load started for:', audioUrl)}
          onCanPlay={() => console.log('Audio can play for:', audioUrl)}
          onError={(e) => console.error('Audio element error:', e, 'URL:', audioUrl)}
        />
        
        {title && (
          <div className="mb-4">
            <h4 className="font-medium text-sm truncate">{title}</h4>
          </div>
        )}
        
        {/* Progress Bar */}
        <div className={isMobile ? "mb-3" : "mb-4"}>
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className={`cursor-pointer ${isMobile ? 'h-6' : ''}`}
            disabled={isLoading || audioDuration === 0}
          />
          <div className={`flex justify-between ${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground mt-1 font-mono`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size={isMobile ? "default" : "sm"}
              onClick={handlePlayPause}
              disabled={isLoading}
              className={isMobile ? "h-10 w-10" : ""}
            >
              {isLoading ? (
                <Loader2 className={`${isMobile ? "w-6 h-6" : "w-5 h-5"} animate-spin`} />
              ) : isPlaying ? (
                <Pause className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
              ) : (
                <Play className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
              )}
            </Button>
          </div>
          
          {/* Volume Control - Hide on mobile to save space */}
          {!isMobile && (
            <div className="flex items-center gap-2 min-w-0 flex-1 ml-4">
              <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="max-w-[80px]"
              />
            </div>
          )}
          
          {/* Mobile-specific: Show current time on the right */}
          {isMobile && (
            <div className="text-sm text-muted-foreground font-mono">
              {formatTime(currentTime)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;