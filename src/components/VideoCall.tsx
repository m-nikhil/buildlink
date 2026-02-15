import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, ExternalLink } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  remoteUserId: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  remoteUserInitials?: string;
  onCallEnded?: () => void;
}

function getJitsiRoomName(roomId: string): string {
  return `buildlink-${roomId.replace(/[^a-zA-Z0-9-]/g, '')}`;
}

export function VideoCall({
  roomId,
  remoteUserName,
  remoteUserInitials = '?',
}: VideoCallProps) {
  const jitsiRoom = getJitsiRoomName(roomId);
  const displayName = remoteUserName || remoteUserInitials;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#userInfo.displayName=${encodeURIComponent(displayName)}&config.prejoinConfig.enabled=false`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Ready to connect?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Join a video call with {displayName}
          </p>
        </div>

        <Button
          size="lg"
          className="gap-2"
          onClick={() => window.open(jitsiUrl, '_blank', 'noopener,noreferrer')}
        >
          <Video className="h-5 w-5" />
          Join Video Call
          <ExternalLink className="h-4 w-4" />
        </Button>

        <p className="text-xs text-muted-foreground">Opens in a new tab via Jitsi Meet</p>
      </CardContent>
    </Card>
  );
}
