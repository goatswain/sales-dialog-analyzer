import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSetup } from './ProfileSetup';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export const ProfileGuard: React.FC<ProfileGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (user) {
      checkProfile();
    }
  }, [user]);

  const checkProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error checking profile:', error);
        setHasProfile(false);
      } else {
        // Profile exists and has display name
        setHasProfile(!!data?.display_name);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    setHasProfile(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasProfile && user) {
    return (
      <ProfileSetup 
        user={user} 
        onComplete={handleProfileComplete} 
        isRequired={true}
      />
    );
  }

  return <>{children}</>;
};