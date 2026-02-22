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
        {/* Two interlocking chain links at an angle */}
        {/* Left link */}
        <rect
          x="2"
          y="9"
          width="17"
          height="10"
          rx="5"
          stroke="currentColor"
          strokeWidth="2.4"
          fill="none"
          transform="rotate(-30 10.5 14)"
        />
        {/* Right link */}
        <rect
          x="13"
          y="13"
          width="17"
          height="10"
          rx="5"
          stroke="currentColor"
          strokeWidth="2.4"
          fill="none"
          transform="rotate(-30 21.5 18)"
        />
      </svg>
    </div>
  );
}