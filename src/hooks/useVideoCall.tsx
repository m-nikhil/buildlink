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

  // Generate a unique MiroTalk room name from the roomId
  const mirotalkRoomName = `buildlink-${roomId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const mirotalkUrl = `https://p2p.mirotalk.com/newcall?room=${mirotalkRoomName}`;

  const join = useCallback(() => {
    setStatus('connected');
    setError(null);
  }, []);

  const leave = useCallback(() => {
    setStatus('idle');
    onCallEnded?.();
  }, [onCallEnded]);

  return {
    status,
    error,
    mirotalkUrl,
    mirotalkRoomName,
    join,
    leave,
  };
}
