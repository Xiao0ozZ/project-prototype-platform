import type { ReactNode } from 'react';

interface SurfaceProps {
  children: ReactNode;
  className?: string;
}

export function Surface({ children, className = '' }: SurfaceProps) {
  return <section className={`platform-surface ${className}`.trim()}>{children}</section>;
}
