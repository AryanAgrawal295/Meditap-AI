import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientAvatarProps {
  name: string;
  photo?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12 text-lg',
  md: 'w-20 h-20 text-2xl',
  lg: 'w-28 h-28 text-3xl',
  xl: 'w-36 h-36 text-4xl',
};

const iconSizes = {
  sm: 20,
  md: 32,
  lg: 44,
  xl: 56,
};

export function PatientAvatar({ name, photo, size = 'md', className }: PatientAvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-display font-semibold shadow-medical overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {photo ? (
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User size={iconSizes[size]} />
      )}
    </div>
  );
}
