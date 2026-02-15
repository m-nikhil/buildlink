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

  const mirotalkRoomName = `buildlink-${roomId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Use direct join URL to skip the lobby
  const mirotalkUrl = `https://p2p.mirotalk.com/join?room=${mirotalkRoomName}&name=User&audio=1&video=1&screen=0&chat=0&hide=0&notify=0&duration=unlimited`;

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
