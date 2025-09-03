import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface SimpleAudioPlayerProps {
  audioUrl: string;
  title?: string;
  className?: string;
}

export const SimpleAudioPlayer: React.FC<SimpleAudioPlayerProps> = ({
  audioUrl,
  title,
  className = ""
}) => {
  console.log('SimpleAudioPlayer: Rendering with URL:', audioUrl);

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {title && (
          <div className="mb-4">
            <h4 className="font-medium text-sm truncate">{title}</h4>
          </div>
        )}
        
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Native HTML5 Audio Player (Fallback)
          </p>
          
          {/* Native HTML5 audio with full controls */}
          <audio 
            controls 
            preload="none"
            className="w-full"
            onLoadStart={() => console.log('SimpleAudioPlayer: Load started')}
            onCanPlay={() => console.log('SimpleAudioPlayer: Can play')}
            onPlay={() => console.log('SimpleAudioPlayer: Playing')}
            onPause={() => console.log('SimpleAudioPlayer: Paused')}
            onError={(e) => {
              console.error('SimpleAudioPlayer: Error:', e);
              const audio = e.currentTarget;
              console.error('SimpleAudioPlayer: Error details:', {
                error: audio.error,
                networkState: audio.networkState,
                readyState: audio.readyState,
                src: audio.src
              });
            }}
          >
            <source src={audioUrl} type="audio/wav" />
            <source src={audioUrl} type="audio/mpeg" />
            <source src={audioUrl} type="audio/mp4" />
            <source src={audioUrl} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
          
          <div className="text-xs text-muted-foreground">
            <p>Audio URL: <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              {audioUrl.substring(0, 50)}...
            </a></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleAudioPlayer;