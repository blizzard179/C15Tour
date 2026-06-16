import { setAudioModeAsync } from 'expo-audio';
import { NativeModules, Platform } from 'react-native';
import { API_BASE_URL } from '@/constants/api';

declare const require: (moduleName: string) => any;

export type LiveAudioStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'live'
  | 'muted'
  | 'paused'
  | 'unavailable'
  | 'unsupported'
  | 'error';

type LiveAudioRole = 'leader' | 'participant';
type LeaderCallState = 'idle' | 'live' | 'muted';
type SessionDescriptionPayload = {
  sdp: string;
  type: string | null;
};
type MediaStreamLike = {
  getTracks: () => { stop: () => void; enabled: boolean }[];
  getAudioTracks: () => { enabled: boolean }[];
};
type PeerConnectionLike = {
  connectionState: string;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  addTrack: (track: unknown, stream: MediaStreamLike) => unknown;
  close: () => void;
  createAnswer: () => Promise<SessionDescriptionPayload>;
  createOffer: () => Promise<SessionDescriptionPayload>;
  getSenders: () => { track: unknown | null }[];
  setLocalDescription: (description: SessionDescriptionPayload) => Promise<void>;
  setRemoteDescription: (description: unknown) => Promise<void>;
};
type WebRTCModule = {
  mediaDevices: {
    getUserMedia: (constraints: { audio: boolean; video: boolean }) => Promise<MediaStreamLike>;
  };
  RTCIceCandidate: new (candidate: unknown) => unknown;
  RTCPeerConnection: new (configuration: { iceServers: { urls: string }[] }) => PeerConnectionLike;
  RTCSessionDescription: new (description: SessionDescriptionPayload) => unknown;
  registerGlobals?: () => void;
};

export type LiveAudioState = {
  status: LiveAudioStatus;
  message: string;
};

type SignalingMessage = {
  type: string;
  clientId?: string;
  leaders?: string[];
  participants?: string[];
  participantId?: string;
  leaderId?: string;
  targetId?: string;
  from?: string;
  state?: LeaderCallState;
  sdp?: SessionDescriptionPayload;
  candidate?: unknown;
  message?: string;
};

type LiveAudioSessionOptions = {
  tripId: number | string;
  role: LiveAudioRole;
  onStateChange: (state: LiveAudioState) => void;
};

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const toLiveAudioSocketUrl = (tripId: number | string, role: LiveAudioRole) => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '').replace(/^http/i, 'ws');
  return `${baseUrl}/live-audio?tripId=${encodeURIComponent(String(tripId))}&role=${role}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

let cachedWebRTC: WebRTCModule | null = null;

const loadWebRTC = () => {
  if (cachedWebRTC) return cachedWebRTC;

  if (!NativeModules.WebRTCModule) {
    const target = Platform.OS === 'web' ? 'un navigateur WebRTC' : 'un build natif avec WebRTC';
    throw new Error(`Le live audio necessite ${target}. Lancez l app avec un dev client ou un APK rebuild, pas Expo Go.`);
  }

  try {
    const webRTC = require('react-native-webrtc') as WebRTCModule;
    if (!webRTC.RTCPeerConnection || !webRTC.mediaDevices?.getUserMedia) {
      throw new Error('Module WebRTC incomplet.');
    }

    webRTC.registerGlobals?.();
    cachedWebRTC = webRTC;
    return webRTC;
  } catch {
    throw new Error('Le live audio necessite un build natif avec WebRTC. Lancez l app avec un dev client ou un build natif, pas Expo Go.');
  }
};

export class LiveAudioSession {
  private readonly tripId: number | string;
  private readonly role: LiveAudioRole;
  private readonly onStateChange: (state: LiveAudioState) => void;
  private socket: WebSocket | null = null;
  private clientId: string | null = null;
  private localStream: MediaStreamLike | null = null;
  private remoteStream: MediaStreamLike | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private peerConnections = new Map<string, PeerConnectionLike>();
  private knownParticipants = new Set<string>();
  private knownLeaders = new Set<string>();
  private callState: LeaderCallState = 'idle';
  private isParticipantPaused = false;
  private isStopped = false;
  private webRTC: WebRTCModule | null = null;

  constructor(options: LiveAudioSessionOptions) {
    this.tripId = options.tripId;
    this.role = options.role;
    this.onStateChange = options.onStateChange;
  }

  async startLeader(initialState: Exclude<LeaderCallState, 'idle'>) {
    const webRTC = this.ensureWebRTCAvailable();
    this.isStopped = false;
    this.callState = initialState;
    this.emit({
      status: 'connecting',
      message: 'Connexion audio en cours...',
    });

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    this.localStream = await webRTC.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.setLocalTracksEnabled(initialState === 'live');
    this.connectSocket();
  }

  async startParticipant() {
    this.ensureWebRTCAvailable();
    this.isStopped = false;
    this.emit({
      status: 'connecting',
      message: 'Connexion au direct audio...',
    });

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    this.connectSocket();
  }

  setLeaderCallState(state: LeaderCallState) {
    if (this.role !== 'leader') return;

    this.callState = state;
    this.setLocalTracksEnabled(state === 'live');
    this.send({
      type: 'call-state',
      state,
    });

    if (state === 'idle') {
      this.emit({
        status: 'idle',
        message: 'Micro inactif.',
      });
      return;
    }

    this.emit({
      status: state,
      message: state === 'live'
        ? 'Direct audio en cours.'
        : 'Micro coupe, direct en pause.',
    });

    if (state === 'live') {
      this.knownParticipants.forEach((participantId) => {
        this.createLeaderOffer(participantId);
      });
    }
  }

  pauseParticipantAudio() {
    if (this.role !== 'participant') return;

    this.isParticipantPaused = true;
    this.setRemoteTracksEnabled(false);
    this.remoteAudioElement?.pause();
    this.emit({
      status: 'paused',
      message: 'Audio en pause.',
    });
  }

  async resumeParticipantAudio() {
    if (this.role !== 'participant') return;

    this.isParticipantPaused = false;
    this.setRemoteTracksEnabled(true);

    try {
      await this.remoteAudioElement?.play();
    } catch {
      // Some platforms play remote WebRTC audio without an HTML audio element.
    }

    this.emit({
      status: this.remoteStream ? 'live' : 'waiting',
      message: this.remoteStream ? 'Audio du leader en direct.' : 'En attente du direct audio...',
    });
  }

  stop() {
    this.isStopped = true;

    if (this.role === 'leader') {
      this.send({ type: 'call-state', state: 'idle' });
    }

    this.peerConnections.forEach((peerConnection) => peerConnection.close());
    this.peerConnections.clear();
    this.knownParticipants.clear();
    this.knownLeaders.clear();
    this.remoteStream = null;

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.remove();
      this.remoteAudioElement = null;
    }

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }

  private ensureWebRTCAvailable() {
    if (!this.webRTC) {
      this.webRTC = loadWebRTC();
    }

    return this.webRTC;
  }

  private connectSocket() {
    this.socket = new WebSocket(toLiveAudioSocketUrl(this.tripId, this.role));

    this.socket.onopen = () => {
      if (this.role === 'participant') {
        this.emit({
          status: 'waiting',
          message: 'En attente du direct audio...',
        });
        this.send({ type: 'participant-ready' });
      } else {
        this.setLeaderCallState(this.callState);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        this.handleSignalingMessage(JSON.parse(String(event.data)));
      } catch (error) {
        console.error('Message audio invalide:', error);
      }
    };

    this.socket.onerror = () => {
      if (this.isStopped) return;

      this.emit({
        status: 'error',
        message: 'Connexion audio indisponible.',
      });
    };

    this.socket.onclose = () => {
      if (this.isStopped) return;

      this.emit({
        status: 'unavailable',
        message: 'Aucun audio disponible.',
      });
    };
  }

  private handleSignalingMessage(message: SignalingMessage) {
    if (message.type === 'joined') {
      this.clientId = message.clientId ?? null;
      message.participants?.forEach((participantId) => this.knownParticipants.add(participantId));
      message.leaders?.forEach((leaderId) => this.knownLeaders.add(leaderId));

      if (this.role === 'leader' && this.callState === 'live') {
        this.knownParticipants.forEach((participantId) => this.createLeaderOffer(participantId));
      }

      if (this.role === 'participant' && this.knownLeaders.size === 0) {
        this.emit({
          status: 'unavailable',
          message: 'Aucun audio disponible.',
        });
      }

      return;
    }

    if (this.role === 'leader') {
      this.handleLeaderMessage(message);
      return;
    }

    this.handleParticipantMessage(message);
  }

  private handleLeaderMessage(message: SignalingMessage) {
    if (message.type === 'participant-joined' && message.participantId) {
      this.knownParticipants.add(message.participantId);
      if (this.callState === 'live') {
        this.createLeaderOffer(message.participantId);
      }
      return;
    }

    if (message.type === 'participant-ready' && message.from) {
      this.knownParticipants.add(message.from);
      if (this.callState === 'live') {
        this.createLeaderOffer(message.from);
      }
      return;
    }

    if (message.type === 'participant-left' && message.participantId) {
      this.knownParticipants.delete(message.participantId);
      this.closePeer(message.participantId);
      return;
    }

    if (message.type === 'answer' && message.from && message.sdp) {
      const peerConnection = this.peerConnections.get(message.from);
      const webRTC = this.ensureWebRTCAvailable();
      peerConnection?.setRemoteDescription(new webRTC.RTCSessionDescription(message.sdp)).catch((error) => {
        console.error('Erreur remote description participant:', error);
      });
      return;
    }

    if (message.type === 'ice-candidate' && message.from && message.candidate) {
      const peerConnection = this.peerConnections.get(message.from);
      const webRTC = this.ensureWebRTCAvailable();
      peerConnection?.addIceCandidate(new webRTC.RTCIceCandidate(message.candidate)).catch((error) => {
        console.error('Erreur ICE participant:', error);
      });
    }
  }

  private handleParticipantMessage(message: SignalingMessage) {
    if (message.type === 'leader-available' && message.leaderId) {
      this.knownLeaders.add(message.leaderId);
      this.send({ type: 'participant-ready', targetId: message.leaderId });
      return;
    }

    if (message.type === 'leader-left' && message.leaderId) {
      this.knownLeaders.delete(message.leaderId);
      this.closePeer(message.leaderId);
      if (this.knownLeaders.size === 0) {
        this.emit({
          status: 'unavailable',
          message: 'Aucun audio disponible.',
        });
      }
      return;
    }

    if (message.type === 'call-state') {
      this.handleCallState(message.state);
      return;
    }

    if (message.type === 'offer' && message.from && message.sdp) {
      this.handleOffer(message.from, message.sdp);
      return;
    }

    if (message.type === 'ice-candidate' && message.from && message.candidate) {
      const peerConnection = this.peerConnections.get(message.from);
      const webRTC = this.ensureWebRTCAvailable();
      peerConnection?.addIceCandidate(new webRTC.RTCIceCandidate(message.candidate)).catch((error) => {
        console.error('Erreur ICE leader:', error);
      });
    }
  }

  private handleCallState(state?: LeaderCallState) {
    if (state === 'idle') {
      this.emit({
        status: 'unavailable',
        message: 'Aucun audio disponible.',
      });
      return;
    }

    if (state === 'muted') {
      this.emit({
        status: 'muted',
        message: 'Le micro du leader est coupe.',
      });
      return;
    }

    if (state === 'live') {
      const status = this.isParticipantPaused ? 'paused' : this.remoteStream ? 'live' : 'waiting';

      this.emit({
        status,
        message: status === 'paused'
          ? 'Audio en pause.'
          : status === 'live'
            ? 'Audio du leader en direct.'
            : 'Connexion au direct audio...',
      });
    }
  }

  private async createLeaderOffer(participantId: string) {
    const localStream = this.localStream;
    if (!localStream || this.callState !== 'live') return;

    const peerConnection = this.getOrCreatePeer(participantId);
    const existingSenders = peerConnection.getSenders().map((sender) => sender.track).filter(Boolean);

    localStream.getTracks().forEach((track) => {
      if (!existingSenders.includes(track)) {
        peerConnection.addTrack(track, localStream);
      }
    });

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      this.send({
        type: 'offer',
        targetId: participantId,
        sdp: offer,
      });
    } catch (error) {
      console.error('Erreur creation offre audio:', error);
      this.emit({
        status: 'error',
        message: getErrorMessage(error, 'Impossible de lancer le direct audio.'),
      });
    }
  }

  private async handleOffer(leaderId: string, sdp: SessionDescriptionPayload) {
    const peerConnection = this.getOrCreatePeer(leaderId);
    const webRTC = this.ensureWebRTCAvailable();

    try {
      await peerConnection.setRemoteDescription(new webRTC.RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.send({
        type: 'answer',
        targetId: leaderId,
        sdp: answer,
      });
    } catch (error) {
      console.error('Erreur reponse audio:', error);
      this.emit({
        status: 'error',
        message: getErrorMessage(error, 'Impossible de rejoindre le direct audio.'),
      });
    }
  }

  private getOrCreatePeer(peerId: string) {
    const existingPeer = this.peerConnections.get(peerId);
    if (existingPeer) return existingPeer;

    const webRTC = this.ensureWebRTCAvailable();
    const peerConnection = new webRTC.RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.addEventListener('icecandidate', (event) => {
      if (!event.candidate) return;

      this.send({
        type: 'ice-candidate',
        targetId: peerId,
        candidate: event.candidate,
      });
    });

    peerConnection.addEventListener('track', (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      this.remoteStream = stream;
      this.setRemoteTracksEnabled(!this.isParticipantPaused);
      this.attachRemoteAudio(stream);
      this.emit({
        status: this.isParticipantPaused ? 'paused' : 'live',
        message: this.isParticipantPaused ? 'Audio en pause.' : 'Audio du leader en direct.',
      });
    });

    peerConnection.addEventListener('connectionstatechange', () => {
      if (this.role !== 'participant') return;

      if (['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState)) {
        this.emit({
          status: 'unavailable',
          message: 'Aucun audio disponible.',
        });
      }
    });

    this.peerConnections.set(peerId, peerConnection);
    return peerConnection;
  }

  private attachRemoteAudio(stream: MediaStreamLike) {
    if (typeof document === 'undefined') return;

    if (!this.remoteAudioElement) {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.autoplay = true;
      (this.remoteAudioElement as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      this.remoteAudioElement.style.display = 'none';
      document.body.appendChild(this.remoteAudioElement);
    }

    (this.remoteAudioElement as unknown as { srcObject: MediaStreamLike | null }).srcObject = stream;
    this.remoteAudioElement.play().catch(() => {});
  }

  private setLocalTracksEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  private setRemoteTracksEnabled(enabled: boolean) {
    this.remoteStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  private closePeer(peerId: string) {
    const peerConnection = this.peerConnections.get(peerId);
    peerConnection?.close();
    this.peerConnections.delete(peerId);
  }

  private send(message: SignalingMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(JSON.stringify(message));
  }

  private emit(state: LiveAudioState) {
    this.onStateChange(state);
  }
}
 export default LiveAudioSession;