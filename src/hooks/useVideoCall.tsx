import { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseVideoCallOptions {
  roomId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

type CallStatus = 'idle' | 'joining' | 'waiting' | 'connecting' | 'connected' | 'error';

export function useVideoCall({ roomId, remoteUserId, onCallEnded }: UseVideoCallOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remotePresent, setRemotePresent] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    callRef.current?.close();
    callRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    setStatus('connected');
  }, []);

  const handleIncomingCall = useCallback((call: MediaConnection) => {
    callRef.current = call;
    setStatus('connecting');
    call.answer(localStreamRef.current!);
    call.on('stream', attachRemoteStream);
    call.on('close', () => {
      console.log('[VideoCall] Incoming call closed');
      setStatus('waiting');
      setRemotePresent(false);
      callRef.current = null;
    });
    call.on('error', (err) => {
      console.error('[VideoCall] Incoming call error:', err);
      setError('Call connection failed');
      setStatus('error');
    });
  }, [attachRemoteStream]);

  const callPeer = useCallback((remotePeerId: string) => {
    if (!peerRef.current || !localStreamRef.current) return;
    if (callRef.current) return; // Already in a call
    console.log('[VideoCall] Calling peer:', remotePeerId);
    setStatus('connecting');
    const call = peerRef.current.call(remotePeerId, localStreamRef.current);
    callRef.current = call;
    call.on('stream', (stream) => {
      retryCountRef.current = 0; // Reset retries on successful connection
      attachRemoteStream(stream);
    });
    call.on('close', () => {
      console.log('[VideoCall] Outgoing call closed');
      callRef.current = null;
      // If we never connected, retry with backoff
      if (retryCountRef.current < 5) {
        retryCountRef.current++;
        const delay = Math.min(2000 * retryCountRef.current, 8000);
        console.log(`[VideoCall] Will retry in ${delay}ms (attempt ${retryCountRef.current})`);
        setStatus('waiting');
        retryTimerRef.current = setTimeout(() => {
          // Only retry if remote is still present
          if (peerRef.current && localStreamRef.current) {
            callPeer(remotePeerId);
          }
        }, delay);
      } else {
        console.log('[VideoCall] Max retries reached, staying in waiting state');
        setStatus('waiting');
        setRemotePresent(false);
      }
    });
    call.on('error', (err) => {
      console.error('[VideoCall] Outgoing call error:', err);
      callRef.current = null;
      setStatus('waiting');
    });
  }, [attachRemoteStream]);

  const join = useCallback(async () => {
    if (!user) return;
    setStatus('joining');
    setError(null);

    try {
      console.log('[VideoCall] Requesting media...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('[VideoCall] Media acquired:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create PeerJS instance with STUN only
      const peerId = `buildlink-${roomId}-${user.id}`.replace(/[^a-zA-Z0-9-]/g, '');
      const peer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });
      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('[VideoCall] Peer open with ID:', id);
        setStatus('waiting');
        // Join Supabase Realtime presence channel
        const channel = supabase.channel(`video-room:${roomId}`, {
          config: { presence: { key: user.id } },
        });
        channelRef.current = channel;

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const userIds = Object.keys(state);
            const otherPresent = userIds.includes(remoteUserId);
            setRemotePresent(otherPresent);

            // If remote user is present and we haven't connected yet, initiate call
            // The user with the "smaller" ID initiates to avoid double-calling
            // Add a small delay to let the remote PeerJS peer initialize
            if (otherPresent && !callRef.current && user.id < remoteUserId) {
              const remotePeerId = `buildlink-${roomId}-${remoteUserId}`.replace(/[^a-zA-Z0-9-]/g, '');
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                if (!callRef.current) {
                  callPeer(remotePeerId);
                }
              }, 1500); // Wait 1.5s for remote peer to be ready
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({ user_id: user.id, joined_at: new Date().toISOString() });
            }
          });
      });

      peer.on('call', handleIncomingCall);

      peer.on('error', (err) => {
        console.error('[VideoCall] PeerJS error:', err.type, err.message);
        if (err.type === 'unavailable-id') {
          setError('Session already active in another tab');
          setStatus('error');
        } else if (err.type === 'peer-unavailable') {
          // Remote peer not ready yet — don't error, stay waiting
          console.log('[VideoCall] Remote peer not available yet, retrying on next presence sync');
        } else {
          setError(`Connection error: ${err.message}`);
          setStatus('error');
        }
      });
    } catch (err) {
      console.error('Failed to join:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera/microphone permission denied. Please allow access and try again.');
      } else {
        setError('Failed to access camera/microphone');
      }
      setStatus('error');
    }
  }, [user, roomId, remoteUserId, callPeer, handleIncomingCall]);

  const leave = useCallback(() => {
    cleanup();
    setStatus('idle');
    setRemotePresent(false);
    onCallEnded?.();
  }, [cleanup, onCallEnded]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
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
  };
}
