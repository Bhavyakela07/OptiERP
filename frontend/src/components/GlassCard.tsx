import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  interactive = false,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`glass-card ${interactive ? 'glass-card-interactive' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
