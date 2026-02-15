import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, PhoneOff } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  remoteUserId: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  remoteUserInitials?: string;
  onCallEnded?: () => void;
}

// Generate a deterministic Jitsi room name from the roomId
function getJitsiRoomName(roomId: string): string {
  // Prefix to avoid collisions, sanitize for Jitsi
  return `buildlink-${roomId.replace(/[^a-zA-Z0-9-]/g, '')}`;
}

export function VideoCall({
  roomId,
  remoteUserName,
  remoteUserInitials = '?',
  onCallEnded,
}: VideoCallProps) {
  const [callStarted, setCallStarted] = useState(false);

  const jitsiRoom = getJitsiRoomName(roomId);
  const displayName = remoteUserName || remoteUserInitials;

  // Build Jitsi Meet URL with config
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(displayName)}`;

  if (!callStarted) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Ready to connect?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a video call with {displayName}
            </p>
          </div>

          <Button onClick={() => setCallStarted(true)} size="lg" className="gap-2">
            <Video className="h-5 w-5" />
            Start Video Call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0"
            title="Video Call"
          />
        </div>

        <div className="p-4 bg-background border-t flex items-center justify-center">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={() => {
              setCallStarted(false);
              onCallEnded?.();
            }}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
