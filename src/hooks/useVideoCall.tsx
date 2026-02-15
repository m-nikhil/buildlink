import { useState, useCallback, useMemo } from 'react';

interface UseVideoCallOptions {
  roomId: string;
  remoteUserId: string;
  displayName?: string;
  onCallEnded?: () => void;
}

type CallStatus = 'idle' | 'joining' | 'connected' | 'error';

export function useVideoCall({ roomId, displayName, onCallEnded }: UseVideoCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const mirotalkRoomName = `buildlink-${roomId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Generate a unique username to avoid "Username already in use" errors
  const uniqueName = useMemo(() => {
    const base = displayName || 'User';
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }, [displayName]);

  const mirotalkUrl = `https://c2c.mirotalk.com/join?room=${mirotalkRoomName}&name=${encodeURIComponent(uniqueName)}`;

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
