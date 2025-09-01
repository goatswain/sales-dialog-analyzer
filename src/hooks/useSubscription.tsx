import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthGuard';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface SubscriptionContextType {
  subscriptionData: SubscriptionData | null;
  loading: boolean;
  showSuccessBanner: boolean;
  dismissSuccessBanner: () => void;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const checkSubscription = async () => {
    if (!user || !session) {
      setSubscriptionData(null);
      return;
    }

    // Avoid rapid successive calls
    const now = Date.now();
    if (now - lastCheckTime < 2000) return;
    setLastCheckTime(now);

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const newData = {
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || null,
        subscription_end: data.subscription_end || null,
      };

      // Check if user just upgraded to Pro
      const wasSubscribed = subscriptionData?.subscribed || false;
      const isNowSubscribed = newData.subscribed;
      
      if (!wasSubscribed && isNowSubscribed) {
        setShowSuccessBanner(true);
        // Send welcome email
        await sendWelcomeEmail();
      }

      setSubscriptionData(newData);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeEmail = async () => {
    try {
      await supabase.functions.invoke('send-pro-welcome-email', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  const dismissSuccessBanner = () => {
    setShowSuccessBanner(false);
  };

  // Check subscription on auth changes
  useEffect(() => {
    if (user && session) {
      checkSubscription();
    } else {
      setSubscriptionData(null);
    }
  }, [user, session]);

  // Check for successful subscription on page load (from Stripe redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true' && user && session) {
      // Delay to ensure Stripe has processed the subscription
      setTimeout(() => {
        checkSubscription();
      }, 3000);
    }
  }, [user, session]);

  const value = {
    subscriptionData,
    loading,
    showSuccessBanner,
    dismissSuccessBanner,
    checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};