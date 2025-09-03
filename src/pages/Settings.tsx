import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { Settings as SettingsIcon } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your API keys for transcription and other services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyManager />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Settings;