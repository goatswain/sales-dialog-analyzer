import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProBadge: React.FC<ProBadgeProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <Badge 
      className={`
        bg-pro-gold text-pro-gold-foreground hover:bg-pro-gold/90
        font-bold border border-pro-gold/20 shadow-sm
        ${sizeClasses[size]} ${className}
      `}
    >
      <Crown className={`${iconSizes[size]} mr-1`} />
      PRO
    </Badge>
  );
};

export default ProBadge;