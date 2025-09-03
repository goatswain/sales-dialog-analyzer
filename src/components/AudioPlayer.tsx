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
    if (!audio) return;

    // Mobile-specific optimizations
    audio.preload = isMobile ? 'metadata' : 'auto';
    audio.crossOrigin = 'anonymous';
    
    // Mobile-specific attributes for better compatibility
    if (isMobile) {
      audio.setAttribute('playsinline', 'true'); // Prevent fullscreen on iOS
      audio.setAttribute('webkit-playsinline', 'true'); // Legacy iOS support
      audio.load(); // Preload metadata on mobile
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
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: 'Audio Error',
        description: 'Failed to load audio. Please try again.',
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
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        setIsLoading(true);
        // Load audio first if needed
        if (audio.readyState < 2) {
          await new Promise<void>((resolve, reject) => {
            audio.oncanplay = () => {
              setIsLoading(false);
              resolve();
            };
            audio.onerror = reject;
            audio.load();
          });
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Play/pause error:', error);
      setIsLoading(false);
      
      // Handle mobile interaction requirements
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Tap to Play',
          description: isMobile 
            ? 'Tap the play button to start audio playback on mobile devices.' 
            : 'Click the play button to start audio playback.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Playback Error',
          description: 'Unable to play audio. Please check your connection and try again.',
          variant: 'destructive'
        });
      }
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
          webkit-playsinline="true"
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
          webkit-playsinline="true"
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