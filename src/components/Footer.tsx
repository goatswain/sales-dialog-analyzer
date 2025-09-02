import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>© 2024 SwainAI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;