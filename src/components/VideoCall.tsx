import { useRef, useState, useCallback } from 'react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone, Loader2, Maximize, Minimize } from 'lucide-react';

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
    error,
    isMuted,
    isVideoOff,
    remotePresent,
    localVideoRef,
    remoteVideoRef,
    join,
    leave,
    toggleMute,
    toggleVideo,
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

  const displayName = remoteUserName || remoteUserInitials;

  // Idle state — show join button
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
              Join the video room and wait for {displayName} to arrive
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={join}>
            <Phone className="h-5 w-5" />
            Join Video Room
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Card className="overflow-hidden border-destructive/30">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg text-destructive">Connection Error</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onCallEnded?.()}>Go Back</Button>
            <Button onClick={join} className="gap-2">
              <Phone className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Waiting / Connecting / Connected states — show video UI
  return (
    <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}>
      <Card className={`overflow-hidden ${isFullscreen ? 'border-0 rounded-none flex-1 flex flex-col' : ''}`}>
        <CardContent className={`p-0 ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
          {/* Remote video / waiting state */}
          <div className={`relative w-full bg-muted ${isFullscreen ? 'flex-1' : ''}`} style={isFullscreen ? undefined : { aspectRatio: '16/9' }}>
            {status === 'connected' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={remoteUserAvatar} alt={displayName} />
                  <AvatarFallback className="text-2xl bg-primary/10">{remoteUserInitials}</AvatarFallback>
                </Avatar>

                {status === 'joining' && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Setting up camera...</span>
                  </div>
                )}

                {status === 'waiting' && (
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">
                        {remotePresent ? 'Partner found! Connecting...' : `Waiting for ${displayName}...`}
                      </span>
                    </div>
                    {!remotePresent && (
                      <p className="text-xs text-muted-foreground">
                        They'll see you when they join
                      </p>
                    )}
                  </div>
                )}

                {status === 'connecting' && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Establishing connection...</span>
                  </div>
                )}
              </div>
            )}

            {/* Local video PiP */}
            {(status === 'waiting' || status === 'connecting' || status === 'connected') && (
              <div className={`absolute bottom-3 right-3 ${isFullscreen ? 'w-48' : 'w-32'} aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg bg-muted`}>
                {isVideoOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <VideoOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-background border-t flex items-center justify-center gap-3">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={leave}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant={isVideoOff ? 'destructive' : 'secondary'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
