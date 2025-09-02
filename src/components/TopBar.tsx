import React from 'react';
import ProBadge from '@/components/ProBadge';

interface TopBarProps {
  isProUser: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ isProUser }) => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-center h-14 px-4">
        <div className="flex items-center space-x-3">
          <img 
            src="/swainai-logo.png" 
            alt="SwainAI Logo" 
            className="w-12 h-12 object-contain"
          />
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-poppins font-bold text-foreground">SwainAI</h1>
            {isProUser && <ProBadge size="sm" />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;