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
        {/* Interlocking chain links using mask for proper over/under */}
        <defs>
          <mask id={`mask-${size}`}>
            <rect width="32" height="32" fill="white" />
            {/* Cut out left link's bottom segment in overlap zone */}
            <rect x="12" y="16" width="7" height="6" fill="black" rx="1" />
          </mask>
        </defs>

        {/* Left link - full, but bottom masked in overlap zone */}
        <rect
          x="2" y="10" width="16" height="12" rx="6"
          stroke="currentColor" strokeWidth="2.4" fill="none"
          mask={`url(#mask-${size})`}
        />

        {/* Right link - full (passes over left at bottom) */}
        <rect
          x="14" y="10" width="16" height="12" rx="6"
          stroke="currentColor" strokeWidth="2.4" fill="none"
        />

        {/* Redraw left link top segment in overlap zone (passes over right at top) */}
        <line x1="13" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    </div>
  );
}