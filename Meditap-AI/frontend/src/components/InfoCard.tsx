import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InfoCardProps {
  icon: ReactNode;
  label: string;
  value: string | ReactNode;
  variant?: 'default' | 'highlight' | 'warning';
  className?: string;
}

export function InfoCard({ icon, label, value, variant = 'default', className }: InfoCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
        variant === 'default' && 'bg-secondary/50',
        variant === 'highlight' && 'bg-accent',
        variant === 'warning' && 'bg-coral-light',
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          variant === 'default' && 'bg-primary/10 text-primary',
          variant === 'highlight' && 'bg-primary text-primary-foreground',
          variant === 'warning' && 'bg-destructive text-destructive-foreground'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-foreground font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
