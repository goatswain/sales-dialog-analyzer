import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileGuard } from "./components/ProfileGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SwainReports from '@/pages/SwainReports';
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Calls from "./pages/Calls";
import Profile from "./pages/Profile";
import AuthGuard from "./components/AuthGuard";
import Footer from "./components/Footer";
import { SubscriptionProvider } from "./hooks/useSubscription";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Routes>
            {/* Auth route - outside AuthGuard so unauthenticated users can access */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - wrapped in AuthGuard */}
            <Route path="/*" element={
              <AuthGuard>
                <SubscriptionProvider>
                  <ProfileGuard>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/calls" element={<Calls />} />
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/groups/:groupId" element={<GroupChat />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/swain-reports" element={<SwainReports />} />
                      <Route path="/swain-coaching" element={<SwainReports />} />
                      <Route path="/daily-coaching" element={<SwainReports />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/payment-canceled" element={<PaymentCanceled />} />
                      {/* Catch-all for protected routes */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ProfileGuard>
                </SubscriptionProvider>
              </AuthGuard>
            } />
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
