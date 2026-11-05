import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { backendWebSocketUrl } from '../../../api-endpoints';
import { ChatMessage } from '../../chat/models/chat-message.model';
import { Reaction } from '../../chat/models/reaction.model';
import { Movement, Playback, RoomState } from '../models';

const DEFAULT_ROOM_ID = 'rap-chua-lanh';
type RoomEnvironment = 'indoor' | 'outdoor' | 'gym';
type CinemaEnvironment = 'indoor' | 'outdoor';

@Injectable({ providedIn: 'root' })
export class RoomSocketService {
  readonly state$ = new BehaviorSubject<RoomState | null>(null);
  readonly movement$ = new Subject<Movement>();
  readonly reaction$ = new Subject<Reaction>();
  readonly chat$ = new Subject<ChatMessage>();
  readonly error$ = new Subject<string>();
  readonly connected$ = new BehaviorSubject(false);
  readonly sessionId$ = new BehaviorSubject<string | null>(null);

  private socket?: WebSocket;
  private clientId = '';
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private intentionallyClosed = false;
  private incomingBuffer = '';
  private subscriptionId = 0;
  private currentSeat: number | null = null;
  private currentName = '';
  private currentAvatar = '🧸';
  private currentShirtColor = 0;
  private currentAccessory = 0;
  private currentHairColor = 0;
  private currentVipTier = 0;
  private currentGender: 'male' | 'female' = 'male';
  private currentCharacterShirtColor = '#9FADD9';
  private currentShirtTier = 0;
  private currentUserId = '';
  private currentAuthToken = '';
  private roomId = DEFAULT_ROOM_ID;
  private currentEnvironment: RoomEnvironment = 'indoor';
  private readonly statesByEnvironment = new Map<RoomEnvironment, RoomState>();
  private socketGeneration = 0;

  constructor(private ngZone: NgZone) {}

  connect(
    clientId: string,
    name: string,
    avatar: string,
    seat?: number | null,
    shirtColorIndex = 0,
    accessoryIndex = 0,
    hairColorIndex = 0,
    vipTier = 0,
    userId = '',
    authToken = '',
    roomId = DEFAULT_ROOM_ID,
    gender: 'male' | 'female' = 'male',
    shirtColor = '#9FADD9',
    shirtTier = 0,
  ): void {
    this.roomId = roomId || DEFAULT_ROOM_ID;
    this.currentEnvironment = 'indoor';
    this.statesByEnvironment.clear();
    this.clientId = clientId;
    this.currentSeat = seat !== undefined ? seat : null;
    this.currentName = name;
    this.currentAvatar = avatar;
    this.currentShirtColor = shirtColorIndex;
    this.currentAccessory = accessoryIndex;
    this.currentHairColor = hairColorIndex;
    this.currentVipTier = vipTier;
    this.currentUserId = userId;
    this.currentAuthToken = authToken;
    this.currentGender = gender === 'female' ? 'female' : 'male';
    this.currentCharacterShirtColor = this.safeShirtColor(shirtColor);
    this.currentShirtTier = this.safeShirtTier(shirtTier);
    this.intentionallyClosed = false;
    this.openSocket();
  }

  sendMove(x: number, y: number, face: number): void {
    this.currentSeat = null;
    this.send(`/app/room/${this.roomId}/move`, { clientId: this.clientId, x, y, face, environment: this.currentEnvironment });
  }

  claimSeat(seatIndex: number): void {
    this.currentSeat = seatIndex;
    this.send(`/app/room/${this.roomId}/seat`, { clientId: this.clientId, seatIndex, environment: this.currentEnvironment });
  }

  addVideo(videoId: string, title: string): void {
    this.send(`/app/room/${this.roomId}/queue`, {
      clientId: this.clientId,
      videoId,
      title,
      environment: this.playbackEnvironment,
    });
  }

  updateVideoTitle(
    roomId: string,
    videoId: string,
    title: string,
    environment: CinemaEnvironment = this.playbackEnvironment,
  ): void {
    this.send(`/app/room/${roomId}/queue/title`, {
      clientId: this.clientId,
      videoId,
      title,
      environment,
    });
  }

  voteQueueVideo(videoId: string): void {
    this.send(`/app/room/${this.roomId}/queue/vote`, {
      clientId: this.clientId,
      videoId,
      environment: this.playbackEnvironment,
    });
  }

  voteSkip(): void {
    this.send(`/app/room/${this.roomId}/vote-skip`, {
      clientId: this.clientId,
      environment: this.playbackEnvironment,
    });
  }

  sendChat(text: string, vipTier?: number): void {
    const tier = vipTier !== undefined ? vipTier : this.currentVipTier;
    this.send(`/app/room/${this.roomId}/chat`, { clientId: this.clientId, text, vipTier: tier });
  }

  updateProfile(
    name: string,
    avatar: string,
    shirtColorIndex = 0,
    accessoryIndex = 0,
    hairColorIndex = 0,
    vipTier = 0,
    gender: 'male' | 'female' = this.currentGender,
    shirtColor = this.currentCharacterShirtColor,
    shirtTier = this.currentShirtTier,
  ): void {
    this.currentName = name;
    this.currentAvatar = avatar;
    this.currentShirtColor = shirtColorIndex;
    this.currentAccessory = accessoryIndex;
    this.currentHairColor = hairColorIndex;
    this.currentVipTier = vipTier;
    this.currentGender = gender === 'female' ? 'female' : 'male';
    this.currentCharacterShirtColor = this.safeShirtColor(shirtColor);
    this.currentShirtTier = this.safeShirtTier(shirtTier);
    this.send(`/app/room/${this.roomId}/profile`, {
      clientId: this.clientId,
      name,
      avatar,
      shirtColorIndex,
      accessoryIndex,
      hairColorIndex,
      vipTier,
      gender: this.currentGender,
      shirtColor: this.currentCharacterShirtColor,
      shirtTier: this.currentShirtTier,
    });
  }

  sendReaction(emoji: string): void {
    this.send(`/app/room/${this.roomId}/reaction`, { clientId: this.clientId, emoji, environment: this.currentEnvironment });
  }

  sendDanceAction(action: 'idle' | 'sway' | 'bounce' | 'spin' | 'groove', returnSeat: number | null): void {
    this.send(`/app/room/${this.roomId}/action`, {
      clientId: this.clientId,
      action,
      returnSeat,
      environment: this.currentEnvironment,
    });
  }

  sendPlayback(action: string, playing?: boolean, position?: number): void {
    this.send(`/app/room/${this.roomId}/playback`, {
      clientId: this.clientId,
      action,
      playing,
      position,
      environment: this.playbackEnvironment,
    });
  }

  setEnvironment(environment: RoomEnvironment): void {
    const next = environment === 'outdoor' || environment === 'gym' ? environment : 'indoor';
    if (next === this.currentEnvironment) return;
    this.currentEnvironment = next;
    this.currentSeat = null;
    // Clear the old scene immediately; the backend will publish the authoritative roster for the destination.
    this.state$.next(null);
    this.send(`/app/room/${this.roomId}/environment`, { clientId: this.clientId, environment: next });
  }

  private get playbackEnvironment(): CinemaEnvironment {
    return this.currentEnvironment === 'outdoor' ? 'outdoor' : 'indoor';
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.socketGeneration++;
    clearTimeout(this.reconnectTimer);
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, 'Rời phòng');
    }
    this.connected$.next(false);
    this.sessionId$.next(null);
    this.state$.next(null);
    this.statesByEnvironment.clear();
  }

  private openSocket(): void {
    if (this.intentionallyClosed) return;
    if (typeof window === 'undefined' || typeof location === 'undefined') return;
    const generation = ++this.socketGeneration;
    const host = location.host || 'localhost:4200';
    const socket = new WebSocket(backendWebSocketUrl());
    this.socket = socket;
    this.incomingBuffer = '';
    socket.onopen = () => {
      if (generation !== this.socketGeneration) return;
      this.ngZone.run(() => {
        this.sendFrame(`CONNECT\naccept-version:1.2\nhost:${host}\nheart-beat:0,0\n\n\0`);
      });
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (generation !== this.socketGeneration) return;
      this.ngZone.run(() => {
        this.incomingBuffer += String(event.data);
        this.readFrames();
      });
    };
    socket.onerror = () => {
      if (generation !== this.socketGeneration) return;
      this.ngZone.run(() => {
        this.error$.next('Không kết nối được tới máy chủ phòng.');
      });
    };
    socket.onclose = () => {
      if (generation !== this.socketGeneration) return;
      this.ngZone.run(() => {
        this.connected$.next(false);
        if (!this.intentionallyClosed) {
          this.reconnectTimer = setTimeout(() => this.openSocket(), 3000);
        }
      });
    };
  }

  private safeShirtColor(color: string): string {
    return /^#[\da-f]{6}$/i.test(color) ? color : '#9FADD9';
  }

  private safeShirtTier(tier: number): number {
    return Number.isInteger(tier) ? Math.max(0, Math.min(6, tier)) : 0;
  }

  private sendFrame(frame: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(frame);
  }

  private readFrames(): void {
    let end = this.incomingBuffer.indexOf('\0');
    while (end >= 0) {
      const raw = this.incomingBuffer.slice(0, end).replace(/\r\n/g, '\n');
      this.incomingBuffer = this.incomingBuffer.slice(end + 1);
      if (raw.trim()) this.handleFrame(raw);
      while (this.incomingBuffer.startsWith('\n'))
        this.incomingBuffer = this.incomingBuffer.slice(1);
      end = this.incomingBuffer.indexOf('\0');
    }
  }

  private handleFrame(raw: string): void {
    const bodyStart = raw.indexOf('\n\n');
    const headerLines = (bodyStart < 0 ? raw : raw.slice(0, bodyStart)).split('\n');
    const command = headerLines.shift()?.trim();
    const headers: Record<string, string> = {};
    for (const line of headerLines) {
      const colon = line.indexOf(':');
      if (colon > 0) headers[line.slice(0, colon)] = line.slice(colon + 1);
    }
    const body = bodyStart < 0 ? '' : raw.slice(bodyStart + 2);

    if (command === 'CONNECTED') {
      this.connected$.next(true);
      const base = `/topic/room/${this.roomId}`;
      for (const destination of [
        `${base}/state/indoor`,
        `${base}/state/outdoor`,
        `${base}/state/gym`,
        `${base}/joined/${this.clientId}`,
        `${base}/movement/indoor`,
        `${base}/movement/outdoor`,
        `${base}/movement/gym`,
        `${base}/reaction/indoor`,
        `${base}/reaction/outdoor`,
        `${base}/reaction/gym`,
        `${base}/chat`,
        `${base}/playback/indoor`,
        `${base}/playback/outdoor`,
        `${base}/errors/${this.clientId}`,
      ])
        this.subscribe(destination);
      this.send(`/app/room/${this.roomId}/join`, {
        clientId: this.clientId,
        environment: this.currentEnvironment,
        name: this.currentName,
        avatar: this.currentAvatar,
        seat: this.currentSeat,
        shirtColorIndex: this.currentShirtColor,
        accessoryIndex: this.currentAccessory,
        hairColorIndex: this.currentHairColor,
        vipTier: this.currentVipTier,
        userId: this.currentUserId,
        authToken: this.currentAuthToken,
        gender: this.currentGender,
        shirtColor: this.currentCharacterShirtColor,
        shirtTier: this.currentShirtTier,
      });
      return;
    }
    if (command === 'ERROR') {
      this.error$.next(headers['message'] || body || 'Lỗi kết nối tới máy chủ phòng.');
      return;
    }
    if (command !== 'MESSAGE') return;

    try {
      const destination = headers['destination'] || '';
      if (destination.endsWith('/state/indoor') || destination.endsWith('/state/outdoor') || destination.endsWith('/state/gym') || destination.endsWith('/state')) {
        const raw = JSON.parse(body) as RoomState;
        // Không cho state cũ hoặc phát nhầm topic làm đổi phim của phòng hiện tại.
        if (raw?.roomId !== this.roomId || raw?.playback?.roomId !== this.roomId) return;
        const environment: RoomEnvironment = destination.endsWith('/state/gym')
          ? 'gym'
          : destination.endsWith('/state/outdoor') ? 'outdoor' : 'indoor';
        const state = this.mapState(raw);
        this.statesByEnvironment.set(environment, state);
        if (environment === this.currentEnvironment) this.state$.next(state);
      } else if (destination.endsWith(`/joined/${this.clientId}`)) {
        const joined = JSON.parse(body) as { sessionId: string; state: any };
        if (
          joined?.state?.roomId !== this.roomId ||
          joined?.state?.playback?.roomId !== this.roomId
        )
          return;
        this.sessionId$.next(joined.sessionId);
        const state = this.mapState(joined.state);
        this.statesByEnvironment.set(this.currentEnvironment, state);
        this.state$.next(state);
      } else if (destination.includes('/movement/')) {
        const environment = destination.slice(destination.lastIndexOf('/') + 1) as RoomEnvironment;
        if (environment === this.currentEnvironment) this.movement$.next(JSON.parse(body) as Movement);
      } else if (destination.includes('/reaction/')) {
        const environment = destination.slice(destination.lastIndexOf('/') + 1) as RoomEnvironment;
        if (environment === this.currentEnvironment) this.reaction$.next(JSON.parse(body) as Reaction);
      }
      else if (destination.endsWith('/chat')) {
        const dto = JSON.parse(body) as {
          id: string;
          senderId: string;
          senderName: string;
          senderAvatar: string;
          text: string;
          time: number;
          vipTier?: number;
        };
        const guestVip =
          this.state$.value?.guests?.find((g) => g.id === dto.senderId)?.vipTier || 0;
        const finalVip = dto.vipTier !== undefined && dto.vipTier > 0 ? dto.vipTier : guestVip;
        this.chat$.next({
          id: dto.id,
          senderId: dto.senderId,
          senderName: dto.senderName,
          senderAvatar: dto.senderAvatar,
          text: dto.text,
          time: new Date(dto.time),
          isMine: dto.senderId === this.sessionId$.value,
          vipTier: finalVip,
        });
      } else if (destination.endsWith('/playback/indoor') || destination.endsWith('/playback/outdoor') || destination.endsWith('/playback')) {
        const playback = JSON.parse(body) as Playback;
        // Playback luôn mang roomId từ backend; bỏ gói tin nếu không thuộc phòng đang mở.
        if (playback?.roomId !== this.roomId) return;
        const environment = destination.endsWith('/playback/outdoor') ? 'outdoor' : 'indoor';
        const current = this.statesByEnvironment.get(environment);
        if (current?.roomId === this.roomId) {
          const updated = { ...current, playback };
          this.statesByEnvironment.set(environment, updated);
          if (environment === this.currentEnvironment) this.state$.next(updated);
        }
        if (environment === 'indoor' && this.currentEnvironment === 'gym') {
          const gymState = this.statesByEnvironment.get('gym');
          if (gymState) {
            const updatedGymState = { ...gymState, playback };
            this.statesByEnvironment.set('gym', updatedGymState);
            this.state$.next(updatedGymState);
          }
        }
      } else if (destination.endsWith(`/errors/${this.clientId}`)) {
        this.error$.next((JSON.parse(body) as { message: string }).message);
      }
    } catch {
      this.error$.next('Máy chủ gửi dữ liệu phòng không hợp lệ.');
    }
  }

  private mapState(raw: any): RoomState {
    if (!raw) return raw;
    let chatHistory: ChatMessage[] = [];
    if (Array.isArray(raw.chatHistory)) {
      chatHistory = raw.chatHistory.map((dto: any) => ({
        id: dto.id,
        senderId: dto.senderId,
        senderName: dto.senderName,
        senderAvatar: dto.senderAvatar,
        text: dto.text,
        time: new Date(dto.time),
        isMine: dto.senderId === this.sessionId$.value,
        vipTier: dto.vipTier || 0,
      }));
    }
    return { ...raw, roomName: raw.roomName || 'Rạp chung', chatHistory };
  }

  private subscribe(destination: string): void {
    const id = `sub-${++this.subscriptionId}`;
    this.sendFrame(`SUBSCRIBE\nid:${id}\ndestination:${destination}\nack:auto\n\n\0`);
  }

  private send(destination: string, body: unknown): void {
    if (!this.connected$.value) {
      this.error$.next('Đang kết nối lại với phòng, thử lại sau giây lát nhé.');
      return;
    }
    this.sendFrame(
      `SEND\ndestination:${destination}\ncontent-type:application/json\n\n${JSON.stringify(body)}\0`,
    );
  }
}
