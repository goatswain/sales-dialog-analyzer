import React from 'react';
import { SubscriptionProvider } from '@/hooks/useSubscription';

interface ConditionalSubscriptionWrapperProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export const ConditionalSubscriptionWrapper: React.FC<ConditionalSubscriptionWrapperProps> = ({ 
  children, 
  isAuthenticated 
}) => {
  if (isAuthenticated) {
    return <SubscriptionProvider>{children}</SubscriptionProvider>;
  }
  return <>{children}</>;
};