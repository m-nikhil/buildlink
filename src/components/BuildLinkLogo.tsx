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
        {/* Chain link / connection symbol */}
        <path
          d="M12 8C12 8 8 8 8 12C8 16 12 16 12 16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M20 8C20 8 24 8 24 12C24 16 20 16 20 16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M12 16C12 16 8 16 8 20C8 24 12 24 12 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M20 16C20 16 24 16 24 20C24 24 20 24 20 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Connecting lines */}
        <path
          d="M12 12H20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M12 20H20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Center dot - representing the spark of connection */}
        <circle
          cx="16"
          cy="16"
          r="2"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}