import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, CreditCard, Settings, Crown, Mail } from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();

  const isProUser = subscriptionData?.subscribed || false;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar isProUser={isProUser} />
      
      <div className="container mx-auto p-4 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {user?.email?.split('@')[0] || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              {isProUser && (
                <Badge variant="secondary" className="bg-pro-gold text-pro-gold-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Account Status</span>
                <Badge variant={isProUser ? "default" : "secondary"}>
                  {isProUser ? 'Pro Member' : 'Free Plan'}
                </Badge>
              </div>
              {isProUser && subscriptionData?.subscription_end && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Subscription Ends</span>
                  <span className="text-sm font-medium">
                    {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/pricing')}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">
                  {isProUser ? 'Manage Subscription' : 'Upgrade to Pro'}
                </span>
              </div>
              <Badge variant="outline">
                {isProUser ? 'Manage' : 'Upgrade'}
              </Badge>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/daily-coaching')}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Daily Coaching</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-destructive/20"
            onClick={handleSignOut}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-destructive" />
                <span className="font-medium text-destructive">Sign Out</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Info */}
        <Card className="bg-accent/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img 
                src="/lovable-uploads/0661e838-ae1b-4b7a-ba8d-98e91f080271.png" 
                alt="Swain AI Logo" 
                className="w-6 h-6 object-contain"
              />
              <span className="font-semibold text-foreground">SwainAI</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered sales call analysis and coaching
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Version 2.0.0
            </p>
          </CardContent>
        </Card>

        {/* Contact Us */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Need help or have questions? We're here to assist you.
              </p>
              <a 
                href="mailto:Swainaicontact@gmail.com" 
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Swainaicontact@gmail.com
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;