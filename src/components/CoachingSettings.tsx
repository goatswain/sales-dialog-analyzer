import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Mail, Bell, Settings } from 'lucide-react';

const CoachingSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '08:00',
    timezone: 'America/New_York',
    autoGenerate: true,
    emailNotifications: true,
    pushNotifications: false,
    includeAudioExamples: true,
    shareWithManager: false,
    managerEmail: ''
  });

  const handleSaveSettings = () => {
    // TODO: Save settings to database
    toast({
      title: "Settings Saved",
      description: "Your coaching preferences have been updated successfully.",
    });
  };

  const handleTestSchedule = () => {
    toast({
      title: "Test Scheduled",
      description: `Test coaching report will be generated ${settings.frequency} at ${settings.time}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Coaching Settings</h2>
        <p className="text-muted-foreground">Configure when and how you receive your Swain Coaching reports.</p>
      </div>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Settings
          </CardTitle>
          <CardDescription>
            Set when you want to receive your coaching reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Report Frequency</Label>
              <Select 
                value={settings.frequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                  setSettings(prev => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Delivery Time</Label>
              <Select 
                value={settings.time} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select 
              value={settings.timezone} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London Time</SelectItem>
                <SelectItem value="Europe/Paris">Central European Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-generate"
              checked={settings.autoGenerate}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGenerate: checked }))}
            />
            <Label htmlFor="auto-generate">Automatically generate reports at scheduled time</Label>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about new reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
            />
            <Label htmlFor="email-notifications">Email notifications</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="push-notifications"
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
            />
            <Label htmlFor="push-notifications">Push notifications</Label>
          </div>
        </CardContent>
      </Card>

      {/* Report Content Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Report Content
          </CardTitle>
          <CardDescription>
            Customize what's included in your coaching reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="include-audio"
              checked={settings.includeAudioExamples}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeAudioExamples: checked }))}
            />
            <Label htmlFor="include-audio">Include audio examples in reports</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="share-manager"
              checked={settings.shareWithManager}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, shareWithManager: checked }))}
            />
            <Label htmlFor="share-manager">Share reports with manager</Label>
          </div>

          {settings.shareWithManager && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="manager-email">Manager Email</Label>
              <input
                id="manager-email"
                type="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="manager@company.com"
                value={settings.managerEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, managerEmail: e.target.value }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleTestSchedule}>
          <Clock className="h-4 w-4 mr-2" />
          Test Schedule
        </Button>
        
        <div className="space-x-2">
          <Button variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </div>
      </div>

      {/* Preview Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Preview</h3>
            <p className="text-sm text-muted-foreground">
              You will receive your <span className="font-medium">{settings.frequency}</span> Swain Coaching report 
              at <span className="font-medium">{settings.time}</span> ({settings.timezone})
            </p>
            {settings.shareWithManager && (
              <p className="text-sm text-muted-foreground mt-1">
                Reports will also be sent to: <span className="font-medium">{settings.managerEmail || 'manager email'}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachingSettings;