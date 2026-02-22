import { cn } from '@/lib/utils';

interface BuildLinkLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BuildLinkLogo({ size = 'md', className }: BuildLinkLogoProps) {
  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
  };

  const iconSizes = {
    sm: 20,
    md: 26,
    lg: 32,
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-lg',
        sizeClasses[size],
        className
      )}
    >
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary-foreground"
      >
        {/* Simple two-link chain — rotated 45° for dynamic feel */}
        <g transform="rotate(-45 16 16)">
          {/* Left link */}
          <rect x="2" y="12" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none" />
          {/* Right link */}
          <rect x="14" y="12" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none" />
        </g>
      </svg>
    </div>
  );
}