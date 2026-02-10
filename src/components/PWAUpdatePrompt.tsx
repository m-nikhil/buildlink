import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function PWAUpdatePrompt() {
  const { updateAvailable, applyUpdate, dismiss } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[60]",
        "bg-card border shadow-lg rounded-lg p-4",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full shrink-0">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">Update Available</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            A new version is ready. Refresh to get the latest features.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="h-8 text-xs" onClick={applyUpdate}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Now
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={dismiss}>
              Later
            </Button>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 -mt-1 -mr-1"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
