import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, BarChart3, CreditCard, Users, Home } from 'lucide-react';
import ProBadge from '@/components/ProBadge';
import { useAuth } from '@/components/AuthGuard';

interface HeaderProps {
  isProUser: boolean;
}

const Header: React.FC<HeaderProps> = ({ isProUser }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/daily-coaching', icon: BarChart3, label: 'Coaching' },
    { path: '/pricing', icon: CreditCard, label: 'Pricing' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/4b956a83-9e3a-439f-bc16-98cefe4019ea.png" 
            alt="SwainAI Logo" 
            className="w-10 h-10 object-contain"
          />
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-poppins font-bold text-foreground">Swain AI</h1>
            {isProUser && <ProBadge size="sm" />}
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex items-center space-x-2 ${
                isActive(item.path) 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>

        {/* Mobile Navigation */}
        <nav className="flex md:hidden items-center space-x-1">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className={isActive(item.path) 
                ? "bg-secondary text-secondary-foreground" 
                : "text-muted-foreground hover:text-foreground"
              }
            >
              <item.icon className="h-4 w-4" />
            </Button>
          ))}
        </nav>

        {/* User Section */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-medium">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-secondary-foreground font-medium text-sm">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut} 
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;