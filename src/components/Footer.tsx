import React from 'react';
import { Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Need support?</span>
          </div>
          <a 
            href="mailto:Swainaicontact@gmail.com" 
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Swainaicontact@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;