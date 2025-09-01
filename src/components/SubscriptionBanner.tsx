import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionBannerProps {
  show: boolean;
  onDismiss: () => void;
  autoHideAfter?: number; // in milliseconds
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ 
  show, 
  onDismiss, 
  autoHideAfter = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (show && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideAfter, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 
      bg-gradient-to-r from-success-bg via-success-bg to-pro-gold
      text-success-foreground shadow-lg border-b-2 border-pro-gold/30
      transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
    `}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-pro-gold animate-pulse" />
            <div className="text-sm md:text-base font-medium">
              🎉 <strong>Congrats, you're now a SwainAI Pro Member!</strong> Enjoy unlimited recordings and advanced coaching.
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="text-success-foreground hover:bg-white/20 p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;