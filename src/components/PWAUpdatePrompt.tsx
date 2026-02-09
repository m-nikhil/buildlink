import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Track the service worker registration globally
let swRegistration: ServiceWorkerRegistration | null = null;
let updateAvailableCallback: (() => void) | null = null;

// Register SW and set up update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = registration;
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
      
      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              updateAvailableCallback?.();
            }
          });
        }
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Set up callback for when update is available
    updateAvailableCallback = () => {
      setShowPrompt(true);
    };
    
    return () => {
      updateAvailableCallback = null;
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      // Tell the waiting SW to take over
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload to get new content
    window.location.reload();
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  if (!showPrompt) return null;

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
            <Button size="sm" className="h-8 text-xs" onClick={handleUpdate}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Now
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 -mt-1 -mr-1"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
