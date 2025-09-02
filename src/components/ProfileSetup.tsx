import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Upload, User, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import { UserAvatar } from './UserAvatar';

interface ProfileSetupProps {
  user: any;
  onComplete: () => void;
  isRequired?: boolean;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete, isRequired = false }) => {
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      
      toast({
        title: 'Success',
        description: 'Avatar uploaded successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Error', 
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile created successfully!',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);  
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="h-5 w-5" />
            Set Up Your Profile
          </CardTitle>
          <CardDescription>
            {isRequired 
              ? 'Please complete your profile to access group chats'
              : 'Complete your profile to get started'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <UserAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              email={user.email}
              size="lg"
            />
            
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Camera className="h-4 w-4" />
                  {avatarUrl ? 'Change photo' : 'Add photo'}
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                className="hidden"
              />
              {uploading && (
                <div className="text-xs text-muted-foreground">Uploading...</div>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name *</Label>
            <Input
              id="displayName"
              placeholder="Enter your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
          </div>

          <Button 
            onClick={saveProfile}
            disabled={saving || !displayName.trim()}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Complete Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};