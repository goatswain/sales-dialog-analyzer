import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Phone, Users, User, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/calls', icon: Phone, label: 'Calls' },
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/swain-coaching', icon: TrendingUp, label: 'Swain AI' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto px-4">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center space-y-1 h-12 px-3 ${
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? "text-primary" : ""}`} />
            <span className={`text-xs font-medium ${isActive(item.path) ? "text-primary" : ""}`}>
              {item.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;