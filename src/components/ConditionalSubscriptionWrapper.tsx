import React from 'react';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { User, Session } from '@supabase/supabase-js';

interface ConditionalSubscriptionWrapperProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  user?: User | null;
  session?: Session | null;
}

export const ConditionalSubscriptionWrapper: React.FC<ConditionalSubscriptionWrapperProps> = ({ 
  children, 
  isAuthenticated,
  user,
  session
}) => {
  if (isAuthenticated) {
    return (
      <SubscriptionProvider user={user} session={session}>
        {children}
      </SubscriptionProvider>
    );
  }
  return <>{children}</>;
};