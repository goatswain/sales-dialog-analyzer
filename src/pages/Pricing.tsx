import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthGuard';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const Pricing = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleProPlanClick = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upgrade to Pro plan.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const freeFeatures = [
    'Access to all features',
    'Record conversations',
    'Automatic transcription', 
    'AI summaries & coaching suggestions',
    'Objection handling insights',
    'Daily coaching reports',
    'Limit: 20 recordings per day'
  ];

  const proFeatures = [
    'Unlimited recordings',
    'All features with no limits',
    'Full AI coaching, transcripts, and objection analysis',
    'Priority processing',
    'Future premium features included'
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your sales conversations with AI-powered coaching and insights
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative flex flex-col h-full border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-foreground">Free</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <CardDescription className="text-base mt-2">
                Get started with essential AI coaching features
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-8">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full">
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative flex flex-col h-full border-2 border-primary shadow-lg hover:shadow-xl transition-all duration-300 md:scale-105">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-medium">
                Best Value
              </Badge>
            </div>
            <CardHeader className="text-center pb-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-foreground">Pro</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold text-primary">$15</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <CardDescription className="text-base mt-2">
                Unlimited access to all premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-8">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleProPlanClick}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Get Started"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Need a custom solution for your team?
          </p>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;