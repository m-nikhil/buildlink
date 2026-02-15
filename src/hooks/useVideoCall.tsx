import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseVideoCallOptions {
  roomId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

type CallStatus = 'idle' | 'joining' | 'waiting' | 'connecting' | 'connected' | 'error';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useVideoCall({ roomId, remoteUserId, onCallEnded }: UseVideoCallOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remotePresent, setRemotePresent] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitiatorRef = useRef(false);
  const hasJoinedRef = useRef(false);

  const cleanup = useCallback(() => {
    console.log('[VideoCall] Cleaning up');
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    hasJoinedRef.current = false;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to the connection
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('[VideoCall] Got remote track:', event.track.kind);
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStatus('connected');
      }
    };

    // Send ICE candidates via Supabase broadcast
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('[VideoCall] Sending ICE candidate');
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            from: user!.id,
          },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[VideoCall] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setStatus('connected');
      } else if (pc.iceConnectionState === 'disconnected') {
        console.log('[VideoCall] Peer disconnected, waiting for reconnection...');
      } else if (pc.iceConnectionState === 'failed') {
        console.error('[VideoCall] ICE connection failed');
        setError('Connection failed. The other person may be behind a strict firewall.');
        setStatus('error');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[VideoCall] Connection state:', pc.connectionState);
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        setStatus('waiting');
        setRemotePresent(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [user]);

  const startNegotiation = useCallback(async () => {
    const pc = pcRef.current;
    const channel = channelRef.current;
    if (!pc || !channel || !user) return;

    console.log('[VideoCall] Creating offer...');
    setStatus('connecting');
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[VideoCall] Sending offer');
      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          sdp: pc.localDescription?.toJSON(),
          from: user.id,
        },
      });
    } catch (err) {
      console.error('[VideoCall] Failed to create offer:', err);
      setError('Failed to establish connection');
      setStatus('error');
    }
  }, [user]);

  const handleOffer = useCallback(async (sdp: RTCSessionDescriptionInit, fromUserId: string) => {
    if (!user || fromUserId === user.id) return;
    console.log('[VideoCall] Received offer from', fromUserId);
    
    let pc = pcRef.current;
    if (!pc) {
      pc = createPeerConnection();
    }

    setStatus('connecting');
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[VideoCall] Sending answer');
      channelRef.current?.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          sdp: pc.localDescription?.toJSON(),
          from: user.id,
        },
      });
    } catch (err) {
      console.error('[VideoCall] Failed to handle offer:', err);
      setError('Failed to connect');
      setStatus('error');
    }
  }, [user, createPeerConnection]);

  const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit, fromUserId: string) => {
    if (!user || fromUserId === user.id) return;
    console.log('[VideoCall] Received answer from', fromUserId);
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('[VideoCall] Failed to handle answer:', err);
    }
  }, [user]);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    if (!user || fromUserId === user.id) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[VideoCall] Failed to add ICE candidate:', err);
    }
  }, [user]);

  const join = useCallback(async () => {
    if (!user || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
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

      // Create the peer connection
      createPeerConnection();

      // Determine who initiates (smaller user ID creates the offer)
      isInitiatorRef.current = user.id < remoteUserId;
      console.log('[VideoCall] Is initiator:', isInitiatorRef.current);

      // Set up Supabase Realtime channel for signaling + presence
      const channel = supabase.channel(`video-room:${roomId}`, {
        config: { presence: { key: user.id } },
      });
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
          handleOffer(payload.sdp, payload.from);
        })
        .on('broadcast', { event: 'answer' }, ({ payload }) => {
          handleAnswer(payload.sdp, payload.from);
        })
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
          handleIceCandidate(payload.candidate, payload.from);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const userIds = Object.keys(state);
          const otherPresent = userIds.includes(remoteUserId);
          setRemotePresent(otherPresent);
          console.log('[VideoCall] Presence sync - other present:', otherPresent, 'users:', userIds);

          // If we're the initiator and the other person is here, start negotiation
          if (otherPresent && isInitiatorRef.current && pcRef.current?.signalingState === 'stable' && !pcRef.current?.remoteDescription) {
            // Delay slightly to ensure both sides are ready
            setTimeout(() => startNegotiation(), 1000);
          }
        })
        .subscribe(async (subStatus) => {
          console.log('[VideoCall] Channel status:', subStatus);
          if (subStatus === 'SUBSCRIBED') {
            setStatus('waiting');
            await channel.track({ user_id: user.id, joined_at: new Date().toISOString() });
          }
        });

    } catch (err) {
      console.error('[VideoCall] Failed to join:', err);
      hasJoinedRef.current = false;
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Camera/microphone permission denied. Please allow access and try again.');
      } else {
        setError('Failed to access camera/microphone');
      }
      setStatus('error');
    }
  }, [user, roomId, remoteUserId, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate, startNegotiation]);

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
