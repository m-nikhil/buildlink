import { useEffect, useRef } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, 
  AlertCircle, Loader2 
} from 'lucide-react';

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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    connectionState,
    isAudioEnabled,
    isVideoEnabled,
    error,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(roomId, remoteUserId);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Notify parent when call ends
  useEffect(() => {
    if (connectionState === 'idle' && onCallEnded) {
      onCallEnded();
    }
  }, [connectionState, onCallEnded]);

  const isConnecting = connectionState === 'connecting' || connectionState === 'requesting-media';
  const isConnected = connectionState === 'connected';
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some(t => t.enabled);

  // Not yet started
  if (connectionState === 'idle') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Ready to connect?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a video call with {remoteUserName || 'your match'}
            </p>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button onClick={startCall} size="lg" className="gap-2">
            <Phone className="h-5 w-5" />
            Start Video Call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Video container */}
        <div className="relative bg-muted aspect-video">
          {/* Remote video (main) */}
          {hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={remoteUserAvatar} alt={remoteUserName} />
                <AvatarFallback className="text-2xl">{remoteUserInitials}</AvatarFallback>
              </Avatar>
              {isConnecting && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </div>
              )}
              {isConnected && !hasRemoteVideo && (
                <span className="text-sm text-muted-foreground">
                  {remoteUserName || 'User'}'s camera is off
                </span>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 md:w-40 md:h-30 bg-background rounded-lg overflow-hidden shadow-lg border">
            {localStream && isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <VideoOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Connection status overlay */}
          {error && (
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-background border-t flex items-center justify-center gap-4">
          <Button
            variant={isAudioEnabled ? 'outline' : 'destructive'}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isVideoEnabled ? 'outline' : 'destructive'}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={endCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
