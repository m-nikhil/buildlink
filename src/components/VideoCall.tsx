import { useRef, useState, useCallback, useEffect } from 'react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, Phone, Maximize, Minimize, ExternalLink } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  remoteUserId: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  remoteUserInitials?: string;
  onCallEnded?: () => void;
}

export function VideoCall({
  roomId,
  remoteUserId,
  remoteUserName,
  remoteUserAvatar,
  remoteUserInitials = '?',
  onCallEnded,
}: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    status,
    mirotalkUrl,
    join,
    leave,
  } = useVideoCall({ roomId, remoteUserId, onCallEnded });

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const displayName = remoteUserName || remoteUserInitials;

  if (status === 'idle') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={remoteUserAvatar} alt={displayName} />
            <AvatarFallback className="text-xl bg-primary/10">{remoteUserInitials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Ready to connect?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Join a video call with {displayName}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button size="lg" className="gap-2 w-full" onClick={join}>
              <Phone className="h-5 w-5" />
              Join Video Call
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}>
      <Card className={`overflow-hidden ${isFullscreen ? 'border-0 rounded-none flex-1 flex flex-col' : ''}`}>
        <CardContent className={`p-0 ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
          <div className={`relative w-full bg-muted ${isFullscreen ? 'flex-1' : ''}`} style={isFullscreen ? undefined : { aspectRatio: '16/9' }}>
            <iframe
              src={mirotalkUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
              style={{ minHeight: isFullscreen ? '100%' : '400px' }}
            />
          </div>

          <div className="p-4 bg-background border-t flex items-center justify-center gap-3">
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={leave}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => window.open(mirotalkUrl, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
