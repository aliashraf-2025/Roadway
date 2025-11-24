import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      // Performance fix: Reduced backdrop-blur from xl to md/lg
      className={`glass-card bg-[var(--card-bg)] backdrop-blur-md border border-[var(--card-border)] rounded-2xl shadow-sm p-4 sm:p-6 transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;