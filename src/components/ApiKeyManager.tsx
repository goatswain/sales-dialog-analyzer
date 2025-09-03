import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Key, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_KEY_STORAGE_KEY = 'openai_api_key';

export const ApiKeyManager: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load API key from localStorage on component mount
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      setIsValid(validateApiKey(storedKey));
    }
  }, []);

  const validateApiKey = (key: string): boolean => {
    return key.trim().length > 0 && (key.startsWith('sk-') || key.startsWith('sk-proj-'));
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    const valid = validateApiKey(value);
    setIsValid(valid);
    
    if (valid) {
      localStorage.setItem(API_KEY_STORAGE_KEY, value.trim());
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved locally.",
      });
    } else if (value.trim() === '') {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  };

  const clearApiKey = () => {
    setApiKey('');
    setIsValid(false);
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    toast({
      title: "API Key Cleared",
      description: "Your OpenAI API key has been removed.",
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          OpenAI API Key
        </CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable audio transcription. Your key is stored securely in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apikey">API Key</Label>
          <div className="relative">
            <Input
              id="apikey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="sk-proj-... or sk-..."
              className={`pr-20 ${isValid ? 'border-green-500' : apiKey ? 'border-red-500' : ''}`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {apiKey && (
                <div className="flex items-center">
                  {isValid ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {apiKey && !isValid && (
            <p className="text-sm text-red-500">
              Invalid API key format. Should start with 'sk-' or 'sk-proj-'
            </p>
          )}
          {isValid && (
            <p className="text-sm text-green-500">
              API key is valid and ready to use
            </p>
          )}
        </div>
        
        {apiKey && (
          <Button 
            onClick={clearApiKey} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Clear API Key
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>• Your API key is stored locally in your browser</p>
          <p>• Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a></p>
          <p>• Transcription requires a valid API key with credits</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Utility function to get API key from storage
export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

// Utility function to check if API key is available
export const hasValidApiKey = (): boolean => {
  const key = getStoredApiKey();
  return key ? (key.startsWith('sk-') || key.startsWith('sk-proj-')) : false;
};