import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getInitials = (displayName?: string | null, email?: string) => {
  if (displayName) {
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  
  return '?';
};

const getAvatarColor = (displayName?: string | null, email?: string) => {
  const name = displayName || email || 'default';
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm', 
  lg: 'h-12 w-12 text-lg'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  displayName,
  email,
  size = 'md',
  className = ''
}) => {
  const initials = getInitials(displayName, email);
  const avatarColor = getAvatarColor(displayName, email);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email || 'User'} />}
      <AvatarFallback className={`${avatarColor} text-white font-medium`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};