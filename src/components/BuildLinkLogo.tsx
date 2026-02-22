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
        {/* Left puzzle piece with tab on right */}
        <path
          d="M3 6h9v4a2.5 2.5 0 0 1 0 5v4h1v4a2.5 2.5 0 0 1 0 5v4H3V6z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="currentColor"
          fillOpacity="0.15"
          strokeLinejoin="round"
        />
        {/* Right puzzle piece with socket on left */}
        <path
          d="M19 6h10v26H19v-4a2.5 2.5 0 0 1 0-5v-4h-1v-4a2.5 2.5 0 0 1 0-5V6z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="currentColor"
          fillOpacity="0.3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}