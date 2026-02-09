import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InviteBubbleProps {
  className?: string;
}

export function InviteBubble({ className }: InviteBubbleProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show on invite page itself
  const isInvitePage = location.pathname === '/invite';

  useEffect(() => {
    // Check if user has dismissed the bubble in this session
    const dismissed = sessionStorage.getItem('invite_bubble_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show bubble after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('invite_bubble_dismissed', 'true');
  };

  const handleClick = () => {
    navigate('/invite');
    handleDismiss();
  };

  if (isInvitePage || isDismissed || !isVisible) return null;

  return (
    <div
      className={cn(
        'fixed left-4 bottom-20 z-50 animate-in slide-in-from-left-5 fade-in duration-500',
        className
      )}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-lg p-4 max-w-[280px]">
        {/* Bubble pointer */}
        <div className="absolute -left-2 bottom-4 w-4 h-4 bg-card border-l border-b border-border rotate-45" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Invite Friends</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share BuildLink with your network and grow together!
            </p>
          </div>
        </div>

        <Button
          onClick={handleClick}
          size="sm"
          className="w-full mt-3"
          variant="default"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Now
        </Button>
      </div>
    </div>
  );
}
