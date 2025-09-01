import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Check subscription status after successful payment
    const timer = setTimeout(() => {
      checkSubscription();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkSubscription]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-success-bg/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-success-bg/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-success-bg" />
          </div>
          <CardTitle className="text-2xl text-success-bg">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your subscription to SwainAI Pro has been activated. You now have access to unlimited recordings and advanced coaching features.
          </p>
          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-success-bg hover:bg-success-bg/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/pricing')}
              className="w-full"
            >
              View Pricing Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;