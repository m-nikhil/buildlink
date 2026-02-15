import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | 'idle' | 'requesting-media';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended';
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

// Free Google STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId: string, remoteUserId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    connectionState: 'idle',
    isAudioEnabled: true,
    isVideoEnabled: true,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);

  const userId = user?.id;

  const localStreamRef = useRef<MediaStream | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
    // Stop local stream tracks using ref to avoid stale closure
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setState({
      localStream: null,
      remoteStream: null,
      connectionState: 'idle',
      isAudioEnabled: true,
      isVideoEnabled: true,
      error: null,
    });
  }, []);

  // Send signaling message via Supabase Realtime
  const sendSignal = useCallback((message: Omit<SignalingMessage, 'from'>) => {
    if (!channelRef.current || !userId) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: { ...message, from: userId },
    });
  }, [userId]);

  // Use a ref for handleSignal so channel listener always gets latest
  const handleSignalRef = useRef<(message: SignalingMessage) => Promise<void>>();

  // Handle incoming signaling messages
  const handleSignal = useCallback(async (message: SignalingMessage) => {
    if (!peerConnectionRef.current || message.from === userId) return;
    if (message.to !== userId) return; // Not for us

    try {
      switch (message.type) {
        case 'offer':
          // Set remote description from offer
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(message.payload as RTCSessionDescriptionInit)
          );
          
          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
          
          // Create and send answer
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          sendSignal({ type: 'answer', to: message.from, payload: answer });
          break;

        case 'answer':
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(message.payload as RTCSessionDescriptionInit)
          );
          
          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
          break;

        case 'ice-candidate':
          if (message.payload) {
            // If remote description isn't set yet, queue the candidate
            if (!peerConnectionRef.current.remoteDescription) {
              pendingCandidatesRef.current.push(message.payload as RTCIceCandidateInit);
            } else {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(message.payload as RTCIceCandidateInit)
              );
            }
          }
          break;

        case 'call-ended':
          cleanup();
          break;
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error);
      setState(prev => ({ ...prev, error: 'Connection error occurred' }));
    }
  }, [userId, sendSignal, cleanup]);

  // Keep handleSignal ref updated
  handleSignalRef.current = handleSignal;

  // Start the call
  const startCall = useCallback(async () => {
    if (!userId || !roomId) return;

    try {
      setState(prev => ({ ...prev, connectionState: 'requesting-media', error: null }));

      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream }));

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Create remote stream to receive tracks
      const remoteStream = new MediaStream();
      setState(prev => ({ ...prev, remoteStream }));

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        setState(prev => ({ ...prev, remoteStream }));
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            to: remoteUserId,
            payload: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setState(prev => ({ ...prev, connectionState: pc.connectionState }));
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setState(prev => ({ ...prev, error: 'Connection lost. Please try again.' }));
        }
      };

      // Subscribe to signaling channel
      const channel = supabase.channel(`webrtc-${roomId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
          // Use ref to always get latest handleSignal
          handleSignalRef.current?.(payload as SignalingMessage);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Determine if we're the initiator (alphabetically first user ID)
            isInitiatorRef.current = userId < remoteUserId;
            
            if (isInitiatorRef.current) {
              // Create and send offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal({ type: 'offer', to: remoteUserId, payload: offer });
            }
          }
        });

    } catch (error) {
      console.error('Error starting call:', error);
      const errorMessage = error instanceof Error 
        ? error.message.includes('Permission denied') 
          ? 'Camera/microphone access denied. Please allow access and try again.'
          : error.message
        : 'Failed to start call';
      setState(prev => ({ ...prev, error: errorMessage, connectionState: 'idle' }));
    }
  }, [userId, roomId, remoteUserId, sendSignal, handleSignal]);

  // End the call
  const endCall = useCallback(() => {
    sendSignal({ type: 'call-ended', to: remoteUserId, payload: null });
    cleanup();
  }, [sendSignal, remoteUserId, cleanup]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
}
