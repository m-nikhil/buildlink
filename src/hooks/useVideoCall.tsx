import { useState, useCallback } from 'react';

interface UseVideoCallOptions {
  roomId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

type CallStatus = 'idle' | 'joining' | 'connected' | 'error';

export function useVideoCall({ roomId, onCallEnded }: UseVideoCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Generate a unique Jitsi room name from the roomId
  const jitsiRoomName = `BuildLink-${roomId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}`;

  const join = useCallback(() => {
    setStatus('connected');
    setError(null);
  }, []);

  const leave = useCallback(() => {
    setStatus('idle');
    onCallEnded?.();
  }, [onCallEnded]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoOff(prev => !prev);
  }, []);

  return {
    status,
    error,
    isMuted,
    isVideoOff,
    remotePresent: false,
    jitsiUrl,
    jitsiRoomName,
    join,
    leave,
    toggleMute,
    toggleVideo,
    localVideoRef: { current: null },
    remoteVideoRef: { current: null },
  };
}
