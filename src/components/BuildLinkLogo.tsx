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
        {/* "B" letter stylized as interlocking links */}
        {/* Vertical bar */}
        <rect x="7" y="5" width="3" height="22" rx="1.5" fill="currentColor" />
        {/* Top bump of B - link shape */}
        <path
          d="M10 5h5.5a5.5 5.5 0 0 1 0 11H10"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Bottom bump of B - link shape */}
        <path
          d="M10 16h7a5.5 5.5 0 0 1 0 11H10"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}