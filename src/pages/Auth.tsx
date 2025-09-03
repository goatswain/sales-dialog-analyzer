import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const inviteToken = searchParams.get('invite');
  const groupName = searchParams.get('group');
  const isInvitation = Boolean(inviteToken && groupName);

  const acceptInvitation = async () => {
    if (!inviteToken) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update invitation as accepted
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', inviteToken)
        .eq('email', user.email);

      if (updateError) {
        console.error('Error accepting invitation:', updateError);
        toast.error('Failed to accept invitation');
        return;
      }

      // Get the group details
      const { data: invitation } = await supabase
        .from('group_invitations')
        .select(`
          group_id,
          groups:group_id(id, name)
        `)
        .eq('token', inviteToken)
        .single();

      if (invitation?.group_id) {
        // Add user to group
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: invitation.group_id,
            user_id: user.id,
            role: 'member'
          });

        if (memberError && !memberError.message.includes('duplicate key')) {
          console.error('Error adding to group:', memberError);
          toast.error('Failed to join group');
          return;
        }

        toast.success(`Successfully joined "${groupName}"!`);
        navigate(`/groups/${invitation.group_id}`);
      }
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      toast.error('Failed to process invitation');
    }
  };

  useEffect(() => {
    // Check if user is already authenticated and has an invitation
    const checkAuthAndInvitation = async () => {
      if (isInvitation) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await acceptInvitation();
        }
      }
    };
    
    checkAuthAndInvitation();
  }, [isInvitation]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      setError(error.message);
    } else {
      if (isInvitation) {
        setMessage('Check your email for the confirmation link, then you\'ll automatically join the group!');
      } else {
        setMessage('Check your email for the confirmation link!');
      }
    }
    
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      if (isInvitation) {
        await acceptInvitation();
      } else {
        navigate('/');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">SwainAI</CardTitle>
          <CardDescription>
            {isInvitation 
              ? `You've been invited to join "${groupName}" - Sign in or create an account to continue`
              : 'Sign in to access your private recordings'
            }
          </CardDescription>
          {isInvitation && (
            <Alert className="mt-4">
              <AlertDescription className="text-center">
                🎉 Joining group: <strong>{groupName}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 characters)"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4 border-destructive">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4">
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;