import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewEncapsulation,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { RoomSocketService } from '../../room/data-access/room-socket.service';
import { AuthApiService } from '../../auth/data-access/auth-api.service';
import { ThreeCinemaComponent } from '../../room/components/three-cinema/three-cinema.component';
import { GymRoomComponent } from '../../room/components/gym-room/gym-room.component';
import { DonationModalComponent } from '../../donations/donation-modal/donation-modal.component';
import { TaskModalComponent } from '../../tasks/task-modal/task-modal.component';
import { WardrobeModalComponent } from '../../wardrobe/wardrobe/wardrobe-modal.component';
import { ClientLoginPageComponent } from '../../auth/client_login-page/client-login-page.component';
import { ClientRegisterPageComponent } from '../../auth/client_register-page/client-register-page.component';

import { Guest, Movement, Playback, RoomState, WardrobeConfig } from '../../room/models';
import { PrivateRoomView, UserNotification } from '../model/cinema-page.model';
import {
  ACCESSORIES,
  AVATARS,
  REACTIONS,
  SHIRT_COLORS,
  WARDROBE_KEY,
} from '../helper/cinema-page.helper';
import { AuthResponse, UserProfile } from '../../auth/models/user-profile.model';
import { ChatMessage } from '../../chat/models/chat-message.model';
import { WardrobeCatalogItem } from '../../wardrobe/models/wardrobe.model';
import {
  CharacterEntryModalComponent,
  CharacterEntrySelection,
  CharacterGender,
} from '../../character-entry/character-entry-modal.component';
import { VIP_LEVELS } from '../../character-entry/vip-levels';
import { YouTubePlayer } from '../../playback/models/youtube.model';
import { PaymentApiService } from '../../payment/data-access/payment-api.service';
import { ChatService } from '../../chat/data-access/chat.service';
import { DonationUiService } from '../../donations/data-access/donation-ui.service';
import { TaskApiService } from '../../tasks/data-access/task-api.service';
import { PersonalMediaApiService } from '../../media/data-access/personal-media-api.service';

import { TaskProgress } from '../../tasks/models/task.model';
import { apiBaseUrl } from '../../../api-endpoints';
import { NotificationStoreService } from '../services/notification-store.service';
import { PrivateRoomModalComponent } from '../private-room-modal/private-room-modal.component';
import { PersonalMediaPanelComponent } from '../personal-media-panel/personal-media-panel.component';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { LobbyPageComponent } from '../../lobby/lobby-page.component';

@Component({
  selector: 'app-cinema-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ThreeCinemaComponent,
    GymRoomComponent,
    DonationModalComponent,
    TaskModalComponent,
    WardrobeModalComponent,
    ClientLoginPageComponent,
    ClientRegisterPageComponent,
    CharacterEntryModalComponent,
    NotificationCenterComponent,
    PrivateRoomModalComponent,
    PersonalMediaPanelComponent,
    LobbyPageComponent,
  ],
  templateUrl: './cinema-page.component.html',
  styleUrl: './cinema-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CinemaPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('playerHost') playerHost!: ElementRef<HTMLDivElement>;
  @ViewChild(ThreeCinemaComponent) threeCinema?: ThreeCinemaComponent;

  // ── Core state ──
  state: RoomState | null = null;
  sessionId: string | null = null;
  guestName = 'Guess';
  clientId = '';
  activeRoomId = 'rap-chua-lanh';
  mySeat: number | null = null;
  private danceReturnSeat: number | null = null;
  selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  get avatar(): string {
    return this.selectedAvatar;
  }
  readonly avatarList = AVATARS;
  connected = false;
  toastMessage = '';
  isBootingRoom = false;
  get notifications(): UserNotification[] {
    return this.notificationStore.notifications;
  }
  private paymentStatusesInitialized = false;
  private vipPaymentStatus = 'NONE';
  private privateRoomPaymentStatus = 'NONE';
  private donationPaymentStatus = 'NONE';

  // ── Auth & Character Modal state ──
  authModalOpen = false;
  authStep: 'login' | 'register' = 'login';
  currentUser: UserProfile | null = null;

  authError = '';
  characterEntryOpen = false;
  characterGender: CharacterGender = 'male';
  characterColorIndex = 2;
  characterShirtColor = '#9FADD9';

  // ── Audio state ──
  isMuted = false;
  volumeLevel = 100;
  readonly volumeControl = new FormControl(100, { nonNullable: true });
  discoEnabled = true;

  // ── Panel ──
  activePanelId: string | null = null;
  mobileActionMenuOpen = false;
  infoPanelOpen = false;
  orientationNoticeDismissed = false;
  currentRoom: 'lobby' | 'cinema' | 'gym' = 'lobby';
  donationModalOpen = false;
  tasksModalOpen = false;
  walletBalance = 0;
  experiencePoints = 0;
  donationTotalConfirmed = 0;

  // ── Queue / Video ──
  readonly queueForm = new FormGroup({
    videoInput: new FormControl('', { nonNullable: true }),
  });
  readonly personalMediaForm = new FormGroup({
    durationSeconds: new FormControl(5, { nonNullable: true }),
  });
  selectedPersonalMedia: File | null = null;
  uploadingPersonalMedia = false;
  private personalMediaEndTimer?: ReturnType<typeof setTimeout>;
  private activePersonalMediaId: string | null = null;
  private endedPersonalMediaId: string | null = null;
  get queueOpen(): boolean {
    return this.activePanelId === 'queue';
  }

  // ── Chat & VIP Chat Frame ──
  readonly footerChatControl = new FormControl(
    { value: '', disabled: true },
    { nonNullable: true },
  );
  readonly panelChatControl = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  readonly chatEmojis = [
    '😀',
    '😂',
    '🥹',
    '😍',
    '❤️',
    '👍',
    '👏',
    '🎉',
    '🔥',
    '✨',
    '🎬',
    '🍿',
    '☕',
    '🎵',
  ];
  chatEmojiPicker: 'footer' | 'panel' | null = null;
  chatMessages: ChatMessage[] = [];
  cinemaChatOpen = false;
  cinemaChatMinimized = false;
  myVipTier = 0;
  myVipLevel = 0;
  activeChatFrameTier = 0;
  equippedFrameTier = 0;
  equippedShirtTier = 0;
  equippedFrameItem: WardrobeCatalogItem | null = null;
  equippedShirtItem: WardrobeCatalogItem | null = null;
  chatAccessStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'NONE';
  privateRoomModalOpen = false;
  privateRoomPending = false;
  privateRoomCodes: PrivateRoomView[] = [];

  // ── Like ──
  likeCount = 0;
  likeAnimating = false;

  // ── Wardrobe & Standing Character ──
  readonly shirtColors = SHIRT_COLORS;
  readonly accessories = ACCESSORIES;
  wardrobe: WardrobeConfig = {
    shirtColorIndex: 2,
    accessoryIndex: 0,
    hairColorIndex: 0,
    displayName: this.guestName,
    gender: 'male',
  };

  // ── Reaction bar ──
  readonly reactionEmojis = REACTIONS;
  readonly danceActions = [
    {
      id: 'sway' as const,
      name: 'Múa quạt',
      icon: 'fa-fan',
      description: 'Quạt tay luân phiên, lượn cổ tay theo nhịp',
    },
    {
      id: 'bounce' as const,
      name: 'Nhún nhảy',
      icon: 'fa-arrow-up',
      description: 'Nhún chân vui vẻ',
    },
    {
      id: 'spin' as const,
      name: 'Xoay vòng',
      icon: 'fa-rotate',
      description: 'Xoay người trên sàn',
    },
    {
      id: 'groove' as const,
      name: 'Quẩy hết mình',
      icon: 'fa-star',
      description: 'Lắc vai và vung tay',
    },
  ];

  // ── YouTube Player state ──
  private player?: YouTubePlayer;
  private audioUnlocked = false;
  private autoMuted = false;
  private lastLoadedVideoId: string | null = null;
  private lastReportedVideoTitle = '';
  private readonly titleRefreshAttempts = new Set<string>();
  private readonly titleRefreshInFlight = new Set<string>();
  playerReady = false;
  videoScreenReady = false;
  autoplayBlocked = false;
  videoPlaybackError: number | null = null;
  outdoorCinemaMode = false;

  private toastTimer?: ReturnType<typeof setTimeout>;
  private pendingVideoId: string | null = null;
  private pendingVideoTimer?: ReturnType<typeof setTimeout>;
  private chatStatusTimer?: ReturnType<typeof setInterval>;
  private walletRefreshTimer?: ReturnType<typeof setInterval>;
  private roomStartupTimer?: ReturnType<typeof setTimeout>;
  private keyboardPosition: { x: number; y: number } | null = null;
  private lastKeyboardMoveAt = 0;
  private isRefreshingAccount = false;
  private isRefreshingChatStatus = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly roomSocket: RoomSocketService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authApi: AuthApiService,
    private readonly paymentApi: PaymentApiService,
    private readonly chatService: ChatService,
    private readonly donationApi: DonationUiService,
    private readonly taskApi: TaskApiService,
    private readonly personalMediaApi: PersonalMediaApiService,
    private readonly notificationStore: NotificationStoreService,
  ) {}

  get isHost(): boolean {
    return !!this.sessionId && this.state?.hostId === this.sessionId;
  }

  get myGuest(): Guest | null {
    return this.state?.guests.find((guest) => guest.id === this.sessionId) ?? null;
  }

  @HostListener('document:keydown', ['$event'])
  onMovementKeydown(event: KeyboardEvent): void {
    if (this.currentRoom !== 'cinema' || !this.connected) return;
    const directionByKey: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      w: 'up',
      arrowup: 'up',
      s: 'down',
      arrowdown: 'down',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
    };
    const direction = directionByKey[event.key.toLowerCase()];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable="true"]'))
    ) {
      return;
    }

    event.preventDefault();
    this.moveCharacterBy(direction);
  }

  moveCharacterBy(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (
      this.currentRoom !== 'cinema' ||
      !this.connected ||
      !this.sessionId ||
      this.authModalOpen ||
      this.characterEntryOpen ||
      this.donationModalOpen ||
      this.tasksModalOpen ||
      this.privateRoomModalOpen
    ) {
      return;
    }
    const guest = this.myGuest;
    if (!guest) return;

    const now = performance.now();
    if (now - this.lastKeyboardMoveAt < 55) return;
    this.lastKeyboardMoveAt = now;

    const position = this.keyboardPosition ?? { x: guest.x, y: guest.y };
    const step = 0.025;
    const next = {
      x: Math.max(
        0.08,
        Math.min(
          0.92,
          position.x + (direction === 'left' ? -step : direction === 'right' ? step : 0),
        ),
      ),
      y: Math.max(
        0.18,
        Math.min(
          0.9,
          position.y + (direction === 'up' ? -step : direction === 'down' ? step : 0),
        ),
      ),
    };
    if (next.x === position.x && next.y === position.y) return;

    this.keyboardPosition = next;
    this.danceReturnSeat = null;
    const face = direction === 'left' ? -1 : direction === 'right' ? 1 : guest.face;
    if (this.mySeat !== null) {
      this.mySeat = null;
      try {
        localStorage.removeItem('healing_my_seat');
      } catch {}
    }
    this.roomSocket.sendMove(next.x, next.y, face);
  }

  switchRoom(room: 'cinema' | 'gym'): void {
    this.mobileActionMenuOpen = false;
    this.currentRoom = room;
    this.roomSocket.setEnvironment(
      room === 'gym' ? 'gym' : this.outdoorCinemaMode ? 'outdoor' : 'indoor',
    );
    this.activePanelId = null;
    this.cdr.markForCheck();
  }

  onCinemaEnvironmentChanged(environment: 'indoor' | 'outdoor'): void {
    this.outdoorCinemaMode = environment === 'outdoor';
    this.roomSocket.setEnvironment(environment);
    this.cdr.markForCheck();
  }

  enterLobbyCinema(environment: 'indoor' | 'outdoor'): void {
    this.currentRoom = 'cinema';
    this.outdoorCinemaMode = environment === 'outdoor';
    this.activePanelId = null;
    this.mobileActionMenuOpen = false;
    this.beginRoomStartup();
    this.connectToCinema();
    this.cdr.markForCheck();
  }

  returnToLobby(): void {
    this.roomSocket.disconnect();
    if (typeof location !== 'undefined' && typeof history !== 'undefined') {
      const url = new URL(location.href);
      url.searchParams.delete('room');
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    clearTimeout(this.roomStartupTimer);
    this.finishRoomStartup();
    this.currentRoom = 'lobby';
    this.connected = false;
    this.state = null;
    this.sessionId = null;
    this.keyboardPosition = null;
    this.mySeat = null;
    this.activePanelId = null;
    this.mobileActionMenuOpen = false;
    this.privateRoomModalOpen = false;
    this.donationModalOpen = false;
    this.cdr.markForCheck();
  }

  get showOutdoorScreenLoading(): boolean {
    return (
      this.outdoorCinemaMode &&
      (!this.state?.playback?.videoId || (!this.playerReady && !this.videoScreenReady))
    );
  }

  screenPosterUrl(playback: Playback): string {
    return playback.source.startsWith('personal-')
      ? this.personalMediaApi.mediaUrl(playback.videoId)
      : `https://img.youtube.com/vi/${playback.videoId}/mqdefault.jpg`;
  }

  playbackSourceLabel(source?: string): string {
    if (source === 'queue') return 'Từ hàng chờ';
    if (source === 'personal-image') return 'Ảnh cá nhân';
    if (source === 'personal-video') return 'Video cá nhân';
    return 'Nhạc nền';
  }

  get queueCount(): number {
    return this.state?.queue?.length ?? 0;
  }

  get personalMediaCost(): number {
    const seconds = Math.max(
      1,
      Math.min(10, Number(this.personalMediaForm.controls.durationSeconds.value) || 1),
    );
    return seconds * 5_000;
  }

  get vipProgressPercent(): number {
    if (this.myVipLevel >= 10) return 100;
    const currentThreshold = VIP_LEVELS[this.myVipLevel]?.minimumTopUp ?? 0;
    const nextThreshold = VIP_LEVELS[this.myVipLevel + 1]?.minimumTopUp ?? currentThreshold;
    const progress = Math.max(
      0,
      Math.min(nextThreshold - currentThreshold, this.donationTotalConfirmed - currentThreshold),
    );
    return nextThreshold === currentThreshold
      ? 0
      : (progress / (nextThreshold - currentThreshold)) * 100;
  }

  get nextVipAmountRemaining(): number {
    if (this.myVipLevel >= 10) return 0;
    return Math.max(
      0,
      (VIP_LEVELS[this.myVipLevel + 1]?.minimumTopUp ?? 0) - this.donationTotalConfirmed,
    );
  }

  get vipHeaderAriaLabel(): string {
    return this.myVipLevel >= 10
      ? 'VIP 10, cấp tối đa'
      : `VIP ${this.myVipLevel}, còn ${this.formatWalletAmount(this.nextVipAmountRemaining)} để lên cấp`;
  }

  get vipHeaderTitle(): string {
    return this.myVipLevel >= 10
      ? 'Bạn đã đạt VIP tối đa'
      : `Còn ${this.formatWalletAmount(this.nextVipAmountRemaining)} tổng nạp đã duyệt để lên VIP ${this.myVipLevel + 1}`;
  }

  get guestCount(): number {
    return this.state?.guests?.length ?? 0;
  }

  get skipVotes(): number {
    return this.state?.skipVotes ?? 0;
  }

  get minSkipVotes(): number {
    return this.state?.requiredSkipVotes ?? Math.max(1, Math.ceil(this.guestCount * 0.9));
  }

  get skipPercent(): number {
    return Math.min(100, Math.round((this.skipVotes / Math.max(1, this.minSkipVotes)) * 100));
  }

  hasVotedSkip = false;

  // ── Lifecycle ──
  ngOnInit(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        let savedClientId = localStorage.getItem('healing_client_id');
        if (!savedClientId) {
          savedClientId = crypto.randomUUID();
          localStorage.setItem('healing_client_id', savedClientId);
        }
        this.clientId = savedClientId;
        this.activateNotificationFeed();

        const savedSeat = localStorage.getItem('healing_my_seat');
        if (savedSeat !== null && savedSeat !== '') {
          const s = Number(savedSeat);
          if (!isNaN(s) && s >= 0 && s < 60) {
            this.mySeat = s;
          }
        }

        const saved = localStorage.getItem(WARDROBE_KEY);
        if (saved) this.wardrobe = JSON.parse(saved) as WardrobeConfig;
        this.guestName = this.wardrobe.displayName || this.guestName;
        this.characterGender = this.wardrobe.gender ?? 'male';
        this.characterColorIndex = Math.max(
          0,
          Math.min(5, this.wardrobe.characterShirtColorIndex ?? 2),
        );
        this.characterShirtColor =
          this.wardrobe.characterShirtColor ?? SHIRT_COLORS[this.characterColorIndex].hex;
        this.setWardrobeDisplayName(this.wardrobe.displayName || this.guestName);

        const savedToken = localStorage.getItem('healing_token');
        const savedUserStr = localStorage.getItem('healing_user');
        if (savedToken && savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr) as UserProfile;
            this.currentUser = u;
            this.myVipLevel = Math.max(0, Math.min(10, u.vipTier ?? 0));
            this.activateNotificationFeed();
            this.guestName = u.displayName || this.guestName;
            this.selectedAvatar = u.avatar || this.selectedAvatar;
            this.wardrobe.shirtColorIndex = u.shirtColorIndex ?? 0;
            this.characterGender = u.gender ?? this.characterGender;
            this.characterColorIndex = Math.max(
              0,
              Math.min(5, this.wardrobe.characterShirtColorIndex ?? u.shirtColorIndex ?? 2),
            );
            this.characterShirtColor =
              this.wardrobe.characterShirtColor ?? SHIRT_COLORS[this.characterColorIndex].hex;
            this.wardrobe.gender = this.characterGender;
            this.wardrobe.accessoryIndex = u.accessoryIndex ?? 0;
            this.wardrobe.hairColorIndex = u.hairColorIndex ?? 0;
            this.setWardrobeDisplayName(this.guestName);
            this.myVipTier = 0;
            void this.refreshChatAccess();
            this.authModalOpen = false;
          } catch {
            this.finishRoomStartup();
            this.authModalOpen = false;
            this.authStep = 'login';
          }
        } else {
          this.authModalOpen = false;
        }
        this.loadWardrobeEquipment();
        if (this.isAuthenticatedUser) {
          void this.refreshWalletAndExperience();
          this.startWalletRefresh();
        }

        const savedVol = localStorage.getItem('healing_volume');
        if (savedVol !== null) {
          const v = Number(savedVol);
          if (!isNaN(v) && v >= 0 && v <= 100) this.volumeLevel = v;
        }
        const savedMuted = localStorage.getItem('healing_muted');
        if (savedMuted === 'true') {
          this.isMuted = true;
        }
        this.discoEnabled = localStorage.getItem('healing_disco_enabled') !== 'false';
        this.volumeControl.setValue(this.isMuted ? 0 : this.volumeLevel, { emitEvent: false });
        this.updateVolumeCss();
      } catch {
        /* ignore */
      }
    }

    if (!this.clientId) {
      this.clientId = crypto.randomUUID();
    }

    this.subscriptions.add(
      this.roomSocket.state$.subscribe((state) => {
        const prevVideoId = this.state?.playback?.videoId;
        this.state = state;
        if (state) {
          const me = this.sessionId
            ? state.guests.find((guest) => guest.id === this.sessionId)
            : undefined;
          if (me) this.keyboardPosition = { x: me.x, y: me.y };
          this.finishRoomStartupIfReady();
          this.refreshMissingVideoTitles(state);
          if (
            this.pendingVideoId &&
            (state.playback?.videoId === this.pendingVideoId ||
              state.queue?.some((item) => item.videoId === this.pendingVideoId))
          ) {
            this.pendingVideoId = null;
            clearTimeout(this.pendingVideoTimer);
            this.addingVideo = false;
            this.toast('Video đã được thêm vào hàng chờ.');
          }
          if (prevVideoId && state.playback.videoId !== prevVideoId) {
            this.hasVotedSkip = false;
          }
          this.applyPlayback(state.playback);
          // Backend trả lịch sử theo roomId; thay toàn bộ danh sách để không mang chat phòng cũ sang.
          this.chatMessages = [...(state.chatHistory ?? [])];
          // Đảm bảo ghế cá nhân của mình luôn được giữ khi kết nối / reload trang
          if (this.mySeat !== null && this.sessionId) {
            const me = state.guests.find((g) => g.id === this.sessionId);
            if (me && me.seat === null && (me.action ?? 'idle') === 'idle') {
              this.roomSocket.claimSeat(this.mySeat);
            } else if (me && (me.action ?? 'idle') !== 'idle' && this.danceReturnSeat === null) {
              this.danceReturnSeat = this.mySeat;
            } else if (me && me.seat !== null) {
              this.mySeat = me.seat;
              try {
                localStorage.setItem('healing_my_seat', String(me.seat));
              } catch {}
            }
          }
        }
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.roomSocket.movement$.subscribe((movement) => {
        this.threeCinema?.applyMovement(movement);
      }),
    );
    this.subscriptions.add(
      this.footerChatControl.valueChanges.subscribe((message) => {
        if (this.panelChatControl.value !== message)
          this.panelChatControl.setValue(message, { emitEvent: false });
      }),
    );
    this.subscriptions.add(
      this.panelChatControl.valueChanges.subscribe((message) => {
        if (this.footerChatControl.value !== message)
          this.footerChatControl.setValue(message, { emitEvent: false });
      }),
    );
    this.subscriptions.add(
      this.roomSocket.sessionId$.subscribe((id) => {
        this.sessionId = id;
        this.syncChatFormState();
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.roomSocket.connected$.subscribe((c) => {
        this.connected = c;
        this.finishRoomStartupIfReady();
        this.syncChatFormState();
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.roomSocket.error$.subscribe((msg) => {
        if (this.pendingVideoId) {
          this.pendingVideoId = null;
          clearTimeout(this.pendingVideoTimer);
          this.addingVideo = false;
        }
        this.toast(msg);
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.roomSocket.chat$.subscribe((msg) => {
        if (!this.chatMessages.some((m) => m.id === msg.id)) {
          this.chatMessages.push(msg);
          setTimeout(() => {
            if (typeof document !== 'undefined') {
              const el = document.querySelector('.chat-messages');
              if (el) el.scrollTop = el.scrollHeight;
            }
          }, 40);
        }
        if (msg.senderId) {
          const senderGuest = this.state?.guests?.find((g) => g.id === msg.senderId);
          const vip =
            msg.vipTier ??
            senderGuest?.vipTier ??
            (msg.senderId === this.sessionId ? this.activeChatFrameTier : 0);
          this.threeCinema?.showBubble(
            msg.senderId,
            msg.text,
            vip,
            msg.senderId === this.sessionId ? this.equippedFrameItem : null,
          );
        }
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.roomSocket.reaction$.subscribe((r) => {
        if (r.emoji === '❤️') {
          this.likeCount++;
          this.triggerLikeAnim();
        }
        this.cdr.markForCheck();
      }),
    );
    if (typeof window !== 'undefined') {
      const linkedRoom = new URLSearchParams(location.search).get('room');
      if (linkedRoom) {
        this.currentRoom = 'cinema';
        this.beginRoomStartup();
        this.connectToCinema(linkedRoom);
      } else {
        this.currentRoom = 'lobby';
        this.setupAudioUnlock();
      }
    }
  }

  connectToCinema(roomOverride?: string): void {
    if (typeof window === 'undefined') return;
    void this.refreshChatAccess();
    const requestedRoomId =
      roomOverride ?? new URLSearchParams(location.search).get('room') ?? 'rap-chua-lanh';
    const roomId = /^[a-z0-9-]{6,64}$/i.test(requestedRoomId) ? requestedRoomId : 'rap-chua-lanh';
    // Xóa ngay khi đổi phòng, trước khi socket mới tải lịch sử của phòng đích.
    this.chatMessages = [];
    this.activeRoomId = roomId;
    this.roomSocket.disconnect();
    this.roomSocket.connect(
      this.clientId,
      this.guestName,
      this.selectedAvatar,
      this.mySeat,
      this.characterColorIndex,
      this.wardrobe.accessoryIndex,
      this.wardrobe.hairColorIndex ?? 0,
      this.myVipTier,
      this.currentUser?.id ?? '',
      localStorage.getItem('healing_token') ?? '',
      roomId,
      this.characterGender,
      this.characterShirtColor,
      this.equippedShirtTier,
      this.outdoorCinemaMode ? 'outdoor' : 'indoor',
    );
    this.setupAudioUnlock();
  }

  get isInPrivateRoom(): boolean {
    return this.activeRoomId !== 'rap-chua-lanh';
  }

  get isAuthenticatedUser(): boolean {
    return !!this.currentUser && !this.currentUser.id.startsWith('guest-');
  }

  get userAuthToken(): string {
    return typeof localStorage === 'undefined' ? '' : (localStorage.getItem('healing_token') ?? '');
  }

  returnToCommonRoom(): void {
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    this.mySeat = null;
    try {
      localStorage.removeItem('healing_my_seat');
    } catch {}
    this.pendingVideoId = null;
    clearTimeout(this.pendingVideoTimer);
    clearTimeout(this.personalMediaEndTimer);
    this.addingVideo = false;
    this.privateRoomModalOpen = false;
    this.activePanelId = null;
    this.lastLoadedVideoId = null;

    // Kết nối lại với room ID mặc định; player sẽ nạp playback và timeline của rạp chung.
    this.connectToCinema('rap-chua-lanh');
    this.toast('Đã quay về rạp chung. Đang đồng bộ phim và hàng chờ…');
    this.cdr.markForCheck();
  }

  /**
   * Mở khoá âm thanh ngay khi người dùng tương tác lần đầu với trang web
   * Giải quyết triệt để chính sách Autoplay Policy của trình duyệt
   */
  private setupAudioUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      const hasPersonalVideo = !!this.playerHost?.nativeElement.querySelector('video');
      if ((this.player && this.playerReady) || hasPersonalVideo) {
        try {
          this.audioUnlocked = true;
          if (this.player && this.playerReady && this.state?.playback?.playing)
            this.player.playVideo();
          if (this.player && this.playerReady && this.autoMuted && this.volumeLevel > 0) {
            this.isMuted = false;
            this.autoMuted = false;
            this.player.unMute();
            this.player.setVolume(this.volumeLevel);
          } else if (this.player && this.playerReady && !this.isMuted && this.volumeLevel > 0) {
            this.player.unMute();
            this.player.setVolume(this.volumeLevel);
          }
          this.updatePersonalVideoAudio();
          this.updateVolumeCss();
          this.cdr.markForCheck();
        } catch {}
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
        document.removeEventListener('touchstart', unlock);
      }
    };
    document.addEventListener('click', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
  }

  ngAfterViewInit(): void {
    this.loadYouTubeApi();
  }

  ngOnDestroy(): void {
    if (this.chatStatusTimer) clearInterval(this.chatStatusTimer);
    if (this.walletRefreshTimer) clearInterval(this.walletRefreshTimer);
    clearTimeout(this.pendingVideoTimer);
    clearTimeout(this.roomStartupTimer);
    this.subscriptions.unsubscribe();
    this.roomSocket.disconnect();
    clearTimeout(this.toastTimer);
    this.player = undefined;
  }

  private beginRoomStartup(): void {
    this.isBootingRoom = true;
    clearTimeout(this.roomStartupTimer);
    // Nếu backend chưa phản hồi, nhường lại màn hình để trạng thái kết nối có thể đọc được.
    this.roomStartupTimer = setTimeout(() => {
      this.finishRoomStartup();
      this.cdr.markForCheck();
    }, 15000);
  }

  private finishRoomStartupIfReady(): void {
    if (this.connected && this.state) this.finishRoomStartup();
  }

  private finishRoomStartup(): void {
    this.isBootingRoom = false;
    clearTimeout(this.roomStartupTimer);
    this.roomStartupTimer = undefined;
  }

  private pendingPlayback: Playback | null = null;
  private ytApiPollTimer?: ReturnType<typeof setInterval>;

  // ══════════════════════════════════════
  //   YOUTUBE PLAYER EMBED (No controls, continuous)
  // ══════════════════════════════════════
  private loadYouTubeApi(): void {
    if (typeof window === 'undefined') return;
    if (window.YT?.Player) {
      this.createPlayer();
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      this.createPlayer();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.append(script);
    }

    // Polling fallback: đề phòng trường hợp iframe_api đã nạp xong từ trước nhưng callback không kích hoạt
    let attempts = 0;
    if (this.ytApiPollTimer) clearInterval(this.ytApiPollTimer);
    this.ytApiPollTimer = setInterval(() => {
      attempts++;
      if (window.YT?.Player) {
        if (this.ytApiPollTimer) clearInterval(this.ytApiPollTimer);
        if (!this.playerReady && !this.player) {
          this.createPlayer();
        }
      } else if (attempts > 25) {
        if (this.ytApiPollTimer) clearInterval(this.ytApiPollTimer);
        if (!this.player) {
          const playback = this.state?.playback;
          if (playback?.source.startsWith('personal-')) this.renderPersonalPlayback(playback);
          else this.createFallbackPlayer();
        }
      }
    }, 150);
  }

  private createPlayer(): void {
    if (!this.playerHost?.nativeElement) return;
    const playback = this.state?.playback;
    if (playback?.source.startsWith('personal-')) {
      this.renderPersonalPlayback(playback);
      return;
    }
    const videoId = playback?.videoId || 'Llw9Q6akRo4';
    const mobilePlayback = this.isMobilePlayback;

    if (!window.YT?.Player) {
      this.createFallbackPlayer();
      return;
    }

    const targetDiv = document.createElement('div');
    targetDiv.id = 'yt-cinema-active-target';
    targetDiv.style.width = '100%';
    targetDiv.style.height = '100%';
    this.playerHost.nativeElement.replaceChildren(targetDiv);

    try {
      this.player = new window.YT.Player(targetDiv, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 1, // BẮT BUỘC cho Autoplay Policy của trình duyệt để video phát tức thì không bị màn hình đen
          controls: mobilePlayback ? 1 : 0,
          disablekb: mobilePlayback ? 0 : 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            this.playerReady = true;
            try {
              event.target.playVideo();
              if (this.audioUnlocked && !this.isMuted && this.volumeLevel > 0) {
                this.player?.unMute();
                this.player?.setVolume(this.volumeLevel);
              } else {
                this.player?.mute();
              }
            } catch {}
            this.updateVolumeCss();
            setTimeout(() => {
              try {
                if (this.player?.isMuted && this.player.isMuted()) {
                  this.isMuted = true;
                  this.updateVolumeCss();
                  this.cdr.markForCheck();
                }
              } catch {}
            }, 600);
            if (this.pendingPlayback) {
              const p = this.pendingPlayback;
              this.pendingPlayback = null;
              this.applyPlayback(p, true);
            } else if (this.state?.playback) {
              this.applyPlayback(this.state.playback, true);
            }
          },
          onStateChange: (event: { data: number }) => {
            if (
              window.YT &&
              [
                window.YT.PlayerState.PLAYING,
                window.YT.PlayerState.PAUSED,
                window.YT.PlayerState.CUED,
              ].includes(event.data)
            ) {
              // Player có thể tự chạy video dự phòng khi state phòng chưa kịp tải ID.
              this.videoScreenReady = true;
              this.cdr.markForCheck();
            }
            if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
              this.autoplayBlocked = false;
              this.videoPlaybackError = null;
              try {
                if (this.audioUnlocked && !this.isMuted && this.volumeLevel > 0) {
                  this.player?.unMute();
                  this.player?.setVolume(this.volumeLevel);
                } else {
                  this.player?.mute();
                }
                this.updateVolumeCss();
                this.cdr.markForCheck();
              } catch {}
              this.syncPlayingVideoTitle();
            }
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              this.roomSocket.sendPlayback('ended');
            }
          },
          onAutoplayBlocked: () => {
            this.autoplayBlocked = true;
            this.cdr.markForCheck();
          },
          onError: (err: any) => {
            console.warn('YouTube Player error:', err);
            this.videoScreenReady = false;
            this.videoPlaybackError = Number.isFinite(err?.data) ? err.data : -1;
            this.cdr.markForCheck();
          },
        },
      });
    } catch (err) {
      console.error('Error creating YT.Player, using fallback iframe:', err);
      this.createFallbackPlayer();
    }
  }

  private createFallbackPlayer(): void {
    if (!this.playerHost?.nativeElement) return;
    const playback = this.state?.playback;
    const videoId = playback?.videoId || 'Llw9Q6akRo4';
    const iframe = document.createElement('iframe');
    iframe.dataset['videoId'] = videoId;
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.src = this.fallbackPlayerUrl(videoId, playback?.position ?? 0);
    iframe.title = 'YouTube video player';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.addEventListener('load', () => {
      this.videoScreenReady = true;
      this.cdr.markForCheck();
    });
    this.playerHost.nativeElement.replaceChildren(iframe);
    this.playerReady = true;
  }

  private applyPlayback(playback: Playback, force = false): void {
    if (playback.source.startsWith('personal-')) {
      this.renderPersonalPlayback(playback);
      return;
    }
    if (this.activePersonalMediaId) {
      clearTimeout(this.personalMediaEndTimer);
      this.player?.destroy?.();
      this.player = undefined;
      this.playerReady = false;
      this.activePersonalMediaId = null;
      this.endedPersonalMediaId = null;
      this.playerHost?.nativeElement.replaceChildren();
    }
    if (!this.player && !this.playerReady) {
      this.pendingPlayback = playback;
      this.createPlayer();
      return;
    }
    if (!this.playerReady || !this.player) {
      this.pendingPlayback = playback;
      if (this.playerHost?.nativeElement) {
        const iframe = this.playerHost.nativeElement.querySelector('iframe');
        // Iframe dự phòng không có player object để seek. Chỉ nạp iframe khi đổi video;
        // đặt lại src theo từng snapshot sẽ khiến YouTube tải lại video từ đầu liên tục.
        if (iframe && playback?.videoId && iframe.dataset['videoId'] !== playback.videoId) {
          this.videoScreenReady = false;
          iframe.dataset['videoId'] = playback.videoId;
          iframe.src = this.fallbackPlayerUrl(playback.videoId, playback.position || 0);
        }
      }
      return;
    }
    let target = Math.max(0, playback.position || 0);
    if (playback.source === 'lofi' && target > 300) {
      target = target % 260;
    }

    // Đảm bảo tôn trọng âm lượng CÁ NHÂN của riêng người dùng này
    try {
      if (this.isMuted || this.volumeLevel === 0 || !this.audioUnlocked) {
        this.player.mute();
        if (!this.audioUnlocked && this.volumeLevel > 0) {
          this.isMuted = true;
          this.autoMuted = true;
        }
      } else {
        this.player.unMute();
        this.player.setVolume(this.volumeLevel);
      }
    } catch {}

    // Nếu là video mới -> nạp và phát video mới ngay lập tức
    if (force || this.lastLoadedVideoId !== playback.videoId) {
      this.lastLoadedVideoId = playback.videoId;
      this.videoScreenReady = false;
      this.videoPlaybackError = null;
      this.cdr.markForCheck();
      this.player.loadVideoById({ videoId: playback.videoId, startSeconds: target });
      setTimeout(() => {
        try {
          if (playback.playing) this.player?.playVideo();
          if (this.isMuted || this.volumeLevel === 0 || !this.audioUnlocked) {
            this.player?.mute();
            if (!this.audioUnlocked && this.volumeLevel > 0) {
              this.isMuted = true;
              this.autoMuted = true;
            }
          } else {
            this.player?.unMute();
            this.player?.setVolume(this.volumeLevel);
          }
        } catch {}
      }, 400);
      return;
    }

    // Nếu video hiện tại đã phát hết (ENDED) -> KHÔNG phát lại từ đầu bài cũ, chờ bài tiếp theo từ backend
    if (window.YT && this.player.getPlayerState() === window.YT.PlayerState.ENDED) {
      return;
    }

    const localTime = this.player.getCurrentTime();
    if (Math.abs(localTime - target) > 3) {
      this.player.seekTo(target, true);
    }
    if (playback.playing && this.player.getPlayerState() !== window.YT?.PlayerState.PLAYING) {
      this.player.playVideo();
    }
  }

  private renderPersonalPlayback(playback: Playback): void {
    const host = this.playerHost?.nativeElement;
    if (!host) return;
    const mediaId = playback.videoId;
    const isNewMedia = this.activePersonalMediaId !== mediaId;
    const elapsed = Math.max(0, (playback.serverNow - playback.updatedAt) / 1000);
    const duration = Math.max(1, playback.durationSeconds || 1);
    const remaining = Math.max(0, duration - elapsed);

    if (isNewMedia) {
      clearTimeout(this.personalMediaEndTimer);
      this.player?.destroy?.();
      this.player = undefined;
      this.playerReady = false;
      this.videoScreenReady = false;
      this.endedPersonalMediaId = null;
      this.activePersonalMediaId = mediaId;
      host.replaceChildren();

      const url = this.personalMediaApi.mediaUrl(mediaId);
      if (playback.source === 'personal-image') {
        const image = document.createElement('img');
        image.src = url;
        image.alt = playback.title;
        image.draggable = false;
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'cover';
        image.addEventListener(
          'load',
          () => {
            this.playerReady = true;
            this.videoScreenReady = true;
            this.cdr.markForCheck();
          },
          { once: true },
        );
        image.addEventListener('error', () => this.toast('Không tải được ảnh đang chiếu.'), {
          once: true,
        });
        host.appendChild(image);
        this.playerReady = true;
        this.videoScreenReady = true;
      } else {
        const video = document.createElement('video');
        video.src = url;
        video.autoplay = playback.playing;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.preload = 'auto';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.addEventListener(
          'loadedmetadata',
          () => {
            video.currentTime =
              Number.isFinite(video.duration) && video.duration > 0 ? elapsed % video.duration : 0;
            if (playback.playing) void video.play().catch(() => undefined);
            this.updatePersonalVideoAudio();
            this.playerReady = true;
            this.videoScreenReady = true;
            this.cdr.markForCheck();
          },
          { once: true },
        );
        video.addEventListener('timeupdate', () => {
          if (this.isHost && (Date.now() - playback.updatedAt) / 1000 >= duration) {
            this.finishPersonalPlayback(mediaId);
          }
        });
        host.appendChild(video);
        this.updatePersonalVideoAudio();
      }
    } else if (playback.source === 'personal-video') {
      const video = host.querySelector('video');
      if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        const target =
          Number.isFinite(video.duration) && video.duration > 0 ? elapsed % video.duration : 0;
        if (Math.abs(video.currentTime - target) > 1.5) video.currentTime = target;
        if (playback.playing && video.paused) void video.play().catch(() => undefined);
        if (!playback.playing && !video.paused) video.pause();
      }
    }

    if (
      playback.source === 'personal-image' &&
      this.isHost &&
      this.endedPersonalMediaId !== mediaId
    ) {
      clearTimeout(this.personalMediaEndTimer);
      this.personalMediaEndTimer = setTimeout(
        () => this.finishPersonalPlayback(mediaId),
        Math.ceil(remaining * 1000),
      );
    }
    this.cdr.markForCheck();
  }

  private finishPersonalPlayback(mediaId: string): void {
    if (!this.isHost || this.endedPersonalMediaId === mediaId) return;
    this.endedPersonalMediaId = mediaId;
    clearTimeout(this.personalMediaEndTimer);
    this.roomSocket.sendPlayback('ended');
  }

  private fallbackPlayerUrl(videoId: string, position: number): string {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: this.isMobilePlayback ? '1' : '0',
      playsinline: '1',
      enablejsapi: '1',
      start: String(Math.max(0, Math.floor(position))),
      origin: window.location.origin,
    });
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }

  private get isMobilePlayback(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
    );
  }

  openCurrentVideoOnYouTube(): void {
    const videoId = this.state?.playback?.videoId;
    if (!videoId || typeof window === 'undefined') return;
    window.open(
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      '_blank',
      'noopener',
    );
  }

  //   PANEL MANAGEMENT
  toggleInfoPanel(): void {
    this.infoPanelOpen = !this.infoPanelOpen;
  }

  dismissOrientationNotice(): void {
    this.orientationNoticeDismissed = true;
  }

  togglePanel(id: string): void {
    this.mobileActionMenuOpen = false;
    if (id === 'chat' && (!this.connected || !this.sessionId)) {
      this.toast('Đang kết nối lại với phòng, vui lòng thử sau giây lát.');
      return;
    }
    this.activePanelId = this.activePanelId === id ? null : id;
  }

  closePanel(): void {
    this.activePanelId = null;
  }

  toggleMobileActionMenu(): void {
    this.mobileActionMenuOpen = !this.mobileActionMenuOpen;
  }

  closeMobileActionMenu(): void {
    this.mobileActionMenuOpen = false;
  }

  toggleDonationModal(): void {
    this.mobileActionMenuOpen = false;
    this.activePanelId = null;
    this.donationModalOpen = !this.donationModalOpen;
  }

  closeDonationModal(): void {
    this.donationModalOpen = false;
    void this.refreshWallet();
  }

  openTasksModal(): void {
    if (!this.isAuthenticatedUser) {
      this.openAuthModal('login');
      this.toast('Đăng nhập để làm nhiệm vụ và lưu EXP vào tài khoản.');
      return;
    }
    this.tasksModalOpen = true;
  }

  applyTaskProgress(progress: TaskProgress): void {
    this.experiencePoints = progress.experiencePoints;
    this.cdr.markForCheck();
  }

  formatWalletAmount(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  }

  private async refreshWalletAndExperience(): Promise<void> {
    await Promise.all([this.refreshWallet(), this.refreshTaskProgress()]);
  }

  private startWalletRefresh(): void {
    if (this.walletRefreshTimer) clearInterval(this.walletRefreshTimer);
    this.walletRefreshTimer = setInterval(() => void this.refreshWallet(), 10000);
  }

  private async refreshWallet(): Promise<void> {
    if (!this.isAuthenticatedUser || this.isRefreshingAccount) return;
    this.isRefreshingAccount = true;
    try {
      const account = await this.donationApi.getAccount(
        this.currentUser!.id,
        localStorage.getItem('healing_token') ?? '',
        true,
      );
      this.walletBalance = account.usableBalance;
      this.donationTotalConfirmed = account.totalConfirmed;
      this.cdr.markForCheck();
    } catch {
      // Giữ nguyên số dư đã tải gần nhất nếu kết nối tạm thời bị lỗi.
    } finally {
      this.isRefreshingAccount = false;
    }
  }

  private async refreshTaskProgress(): Promise<void> {
    if (!this.isAuthenticatedUser) return;
    try {
      const progress = await this.taskApi.getProgress(
        this.currentUser!.id,
        localStorage.getItem('healing_token') ?? '',
      );
      this.applyTaskProgress(progress);
    } catch {
      // Nhiệm vụ vẫn có thể tải lại ngay khi người dùng mở tab nhiệm vụ.
    }
  }

  requestDonationLogin(): void {
    this.donationModalOpen = false;
    this.authStep = 'login';
    this.authError = '';
    this.authModalOpen = true;
  }

  openWardrobeFromDonation(): void {
    this.donationModalOpen = false;
    this.activePanelId = 'wardrobe';
  }

  requestWardrobeLogin(): void {
    this.activePanelId = null;
    this.authStep = 'login';
    this.authError = '';
    this.authModalOpen = true;
  }

  //   QUEUE / VIDEO (Panel: 'queue')
  addingVideo = false;

  onPersonalMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedPersonalMedia = null;
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowed.includes(file.type) || file.size > 20 * 1024 * 1024) {
      this.selectedPersonalMedia = null;
      input.value = '';
      this.toast('Chọn JPG, PNG, WEBP, MP4 hoặc WEBM; dung lượng tối đa 20 MB.');
      return;
    }
    this.selectedPersonalMedia = file;
    this.cdr.markForCheck();
  }

  async uploadPersonalMedia(): Promise<void> {
    if (!this.isAuthenticatedUser) {
      this.openAuthModal('login');
      return;
    }
    if (!this.selectedPersonalMedia) {
      this.toast('Hãy chọn ảnh hoặc video muốn chiếu.');
      return;
    }
    if (!this.connected || !this.sessionId) {
      this.toast('Đang kết nối phòng, vui lòng thử lại sau giây lát.');
      return;
    }
    const freeVipImage =
      !!this.selectedPersonalMedia?.type.startsWith('image/') && this.myVipLevel >= 9;
    if (!freeVipImage && this.walletBalance < this.personalMediaCost) {
      this.toast(`Số dư chưa đủ ${this.formatWalletAmount(this.personalMediaCost)}.`);
      this.toggleDonationModal();
      return;
    }

    this.uploadingPersonalMedia = true;
    this.cdr.markForCheck();
    try {
      const result = await this.personalMediaApi.upload(
        this.selectedPersonalMedia,
        this.currentUser!.id,
        this.userAuthToken,
        this.sessionId,
        this.activeRoomId,
        this.outdoorCinemaMode ? 'outdoor' : 'indoor',
        Math.max(
          1,
          Math.min(10, Number(this.personalMediaForm.controls.durationSeconds.value) || 1),
        ),
      );
      this.walletBalance = result.usableBalance;
      this.selectedPersonalMedia = null;
      this.activePanelId = null;
      this.toast(
        result.freeVipImage
          ? `Đã chiếu “${result.title}” miễn phí theo quyền VIP.`
          : `Đã chiếu “${result.title}” · ${this.formatWalletAmount(result.chargedAmount)}.`,
      );
    } catch (error) {
      this.toast(error instanceof Error ? error.message : 'Không tải được nội dung lên màn ảnh.');
    } finally {
      this.uploadingPersonalMedia = false;
      this.cdr.markForCheck();
    }
  }

  addToQueue(): void {
    if (this.addingVideo) return;
    if (!this.connected || !this.sessionId) {
      this.toast('Phòng chưa kết nối. Đợi trạng thái Đang chiếu rồi thử lại nhé.');
      return;
    }
    const raw = this.queueForm.controls.videoInput.value.trim();
    const id = this.parseVideoId(raw);
    if (!id) {
      this.toast('Link hoặc Video ID YouTube chưa hợp lệ.');
      return;
    }
    // Kiểm tra trùng lặp sơ bộ
    if (this.state) {
      if (
        this.state.playback?.videoId === id ||
        (this.state.queue && this.state.queue.some((item) => item.videoId === id))
      ) {
        this.toast('Video này đã có trong phòng chiếu!');
        return;
      }
    }

    this.addingVideo = true;
    this.pendingVideoId = id;
    const targetRoomId = this.activeRoomId;
    this.queueForm.controls.videoInput.reset('');
    this.roomSocket.addVideo(id, 'Đang lấy tiêu đề video…');
    this.toast('Đã gửi video tới máy chủ. Đang cập nhật tiêu đề…');
    this.pendingVideoTimer = setTimeout(() => {
      if (this.pendingVideoId === id) {
        this.pendingVideoId = null;
        this.toast('Chưa nhận xác nhận từ máy chủ. Hãy kiểm tra kết nối rồi thử lại.');
      }
      this.addingVideo = false;
      this.cdr.markForCheck();
    }, 10000);
    this.cdr.markForCheck();

    // Tải metadata nền để không làm chậm thao tác thêm video; helper cũng cập nhật
    // các video cũ chỉ còn ID khi người dùng tải lại trang hoặc vào lại phòng.
    this.refreshVideoTitle(targetRoomId, id, this.outdoorCinemaMode ? 'outdoor' : 'indoor');
  }

  voteForQueueVideo(videoId: string): void {
    if (!this.connected || !this.sessionId) {
      this.toast('Đang kết nối lại với phòng. Vui lòng thử vote sau giây lát.');
      return;
    }
    this.roomSocket.voteQueueVideo(videoId);
  }

  private async fetchYouTubeTitle(videoId: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const backendUrl = apiBaseUrl();
      const response = await fetch(
        `${backendUrl}/api/youtube/video-title?videoId=${encodeURIComponent(videoId)}`,
        { signal: controller.signal },
      );
      if (!response.ok) return 'Video YouTube';
      const metadata = (await response.json()) as { title?: unknown };
      return typeof metadata.title === 'string' && metadata.title.trim()
        ? metadata.title.trim().slice(0, 100)
        : 'Video YouTube';
    } catch {
      // Giữ thao tác thêm video hoạt động khi YouTube không trả metadata hoặc mạng chặn request.
      return 'Video YouTube';
    } finally {
      clearTimeout(timeout);
    }
  }

  private refreshMissingVideoTitles(state: RoomState): void {
    const environment = this.outdoorCinemaMode ? 'outdoor' : 'indoor';
    for (const item of state.queue ?? []) {
      if (this.needsVideoTitle(item.title, item.videoId)) {
        this.refreshVideoTitle(state.roomId, item.videoId, environment);
      }
    }
    const playback = state.playback;
    if (playback?.source === 'queue' && this.needsVideoTitle(playback.title, playback.videoId)) {
      this.refreshVideoTitle(state.roomId, playback.videoId, environment);
    }
  }

  private needsVideoTitle(title: string | null | undefined, videoId: string): boolean {
    const value = title?.trim() ?? '';
    return (
      !value ||
      value === videoId ||
      value.includes(videoId) ||
      /^(video youtube|đang lấy tiêu đề)/i.test(value)
    );
  }

  private refreshVideoTitle(
    roomId: string,
    videoId: string,
    environment: 'indoor' | 'outdoor',
  ): void {
    const key = `${roomId}:${environment}:${videoId}`;
    if (this.titleRefreshAttempts.has(key) || this.titleRefreshInFlight.has(key)) return;
    this.titleRefreshInFlight.add(key);
    void this.fetchYouTubeTitle(videoId)
      .then((title) => {
        if (title !== 'Video YouTube' && this.activeRoomId === roomId) {
          this.roomSocket.updateVideoTitle(roomId, videoId, title, environment);
        }
      })
      .finally(() => {
        this.titleRefreshInFlight.delete(key);
        this.titleRefreshAttempts.add(key);
      });
  }

  private syncPlayingVideoTitle(): void {
    const playback = this.state?.playback;
    if (!playback || playback.source !== 'queue' || !this.player?.getVideoData) return;

    setTimeout(() => {
      const currentPlayback = this.state?.playback;
      const data = this.player?.getVideoData?.();
      const title = data?.title?.trim();
      if (
        !currentPlayback ||
        currentPlayback.source !== 'queue' ||
        !title ||
        (data?.video_id && data.video_id !== currentPlayback.videoId)
      )
        return;

      const reportKey = `${currentPlayback.roomId}:${currentPlayback.videoId}:${title}`;
      if (this.lastReportedVideoTitle === reportKey) return;
      this.lastReportedVideoTitle = reportKey;
      this.roomSocket.updateVideoTitle(
        currentPlayback.roomId,
        currentPlayback.videoId,
        title,
        this.outdoorCinemaMode ? 'outdoor' : 'indoor',
      );
    }, 350);
  }

  // ══════════════════════════════════════
  //   SEAT MAP (Panel: 'seats')
  // ══════════════════════════════════════
  readonly SEAT_ROWS = 7;
  readonly SEAT_COLS = 10;
  readonly SIDE_SEAT_ROWS = 6;
  readonly SIDE_SEATS_PER_ROW = 4;
  readonly SIDE_SEAT_START = this.SIDE_SEAT_ROWS * this.SEAT_COLS;
  readonly BACK_ROW_SEAT_START =
    this.SIDE_SEAT_START + this.SIDE_SEAT_ROWS * this.SIDE_SEATS_PER_ROW;
  readonly OUTER_SIDE_SEAT_START = this.BACK_ROW_SEAT_START + this.SEAT_COLS;
  readonly OUTER_SIDE_SEATS_PER_ROW = 4;
  readonly TOTAL_SEATS =
    this.OUTER_SIDE_SEAT_START + this.SIDE_SEAT_ROWS * this.OUTER_SIDE_SEATS_PER_ROW;

  get seatGrid(): number[] {
    return Array.from({ length: this.TOTAL_SEATS }, (_, i) => i);
  }

  get seatMapRows(): Array<Array<number | null>> {
    return Array.from({ length: this.SEAT_ROWS }, (_, row) => {
      const centerStart =
        row < this.SIDE_SEAT_ROWS ? row * this.SEAT_COLS : this.BACK_ROW_SEAT_START;
      const hasSideSeats = row < this.SIDE_SEAT_ROWS;
      const sideStart = this.SIDE_SEAT_START + row * this.SIDE_SEATS_PER_ROW;
      const outerSideStart = this.OUTER_SIDE_SEAT_START + row * this.OUTER_SIDE_SEATS_PER_ROW;
      return [
        hasSideSeats ? outerSideStart : null,
        hasSideSeats ? outerSideStart + 1 : null,
        hasSideSeats ? sideStart : null,
        hasSideSeats ? sideStart + 1 : null,
        centerStart,
        centerStart + 1,
        centerStart + 2,
        null,
        centerStart + 3,
        centerStart + 4,
        centerStart + 5,
        centerStart + 6,
        null,
        centerStart + 7,
        centerStart + 8,
        centerStart + 9,
        hasSideSeats ? sideStart + 2 : null,
        hasSideSeats ? sideStart + 3 : null,
        hasSideSeats ? outerSideStart + 2 : null,
        hasSideSeats ? outerSideStart + 3 : null,
      ];
    });
  }

  getSeatOccupant(index: number): Guest | null {
    return this.state?.guests.find((g) => g.seat === index) ?? null;
  }

  isMySeat(index: number): boolean {
    const me = this.state?.guests.find((g) => g.id === this.sessionId);
    return me?.seat === index;
  }

  claimSeat(index: number): void {
    if (this.getSeatOccupant(index) && !this.isMySeat(index)) {
      this.toast('Ghế này đã có người ngồi rồi!');
      return;
    }
    // Clicking the seat already assigned to this character should not restart its walk route.
    if (this.mySeat === index && this.isMySeat(index)) return;

    this.danceReturnSeat = null;
    // Animate from the current seat before updating the optimistic room state. The 3D scene
    // uses that state to recover the character's origin if its model has not been created yet.
    if (this.sessionId) {
      this.threeCinema?.walkToSeat(
        this.sessionId,
        index,
        this.characterColorIndex,
        this.wardrobe.accessoryIndex,
        this.wardrobe.hairColorIndex ?? 0,
        this.myVipTier,
        this.characterGender,
        this.guestName,
        this.characterShirtColor,
        this.equippedShirtTier,
      );
    }

    this.mySeat = index;
    try {
      localStorage.setItem('healing_my_seat', String(index));
    } catch {}

    // Cập nhật ngay ghế của mình không cần đợi server roundtrip
    if (this.state && this.sessionId) {
      const me = this.state.guests.find((g) => g.id === this.sessionId);
      if (me) me.seat = index;
      this.cdr.markForCheck();
    }
    void this.refreshTaskProgress();
    this.roomSocket.claimSeat(index);
    this.activePanelId = null;
    this.cdr.markForCheck();
  }

  // ══════════════════════════════════════
  //   GUEST LIST (Panel: 'guests')
  // ══════════════════════════════════════
  get sortedGuests(): Guest[] {
    return [...(this.state?.guests ?? [])].sort((a, b) => {
      if (a.id === this.sessionId) return -1;
      if (b.id === this.sessionId) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getGuestSeatLabel(guest: Guest): string {
    if ((guest.action ?? 'idle') !== 'idle') {
      return `Đang nhảy · ${this.danceActionName(guest.action ?? 'idle')}`;
    }
    if (guest.seat === null) return 'Đang đứng';
    if (guest.seat >= this.BACK_ROW_SEAT_START) {
      if (guest.seat >= this.OUTER_SIDE_SEAT_START) {
        const outerSeat = guest.seat - this.OUTER_SIDE_SEAT_START;
        const outerSideNames = [
          'Cánh trái ngoài cùng',
          'Cánh trái ngoài',
          'Cánh phải ngoài',
          'Cánh phải ngoài cùng',
        ];
        return `Hàng ${Math.floor(outerSeat / this.OUTER_SIDE_SEATS_PER_ROW) + 1} · ${outerSideNames[outerSeat % this.OUTER_SIDE_SEATS_PER_ROW]}`;
      }
      const col = guest.seat - this.BACK_ROW_SEAT_START + 1;
      return `Hàng 7 · Ghế đôi ${Math.ceil(col / 2)}`;
    }
    if (guest.seat >= this.SIDE_SEAT_START) {
      const sideNames = [
        'Cánh trái ngoài',
        'Cánh trái trong',
        'Cánh phải trong',
        'Cánh phải ngoài',
      ];
      const sideSeat = guest.seat - this.SIDE_SEAT_START;
      return `Hàng ${Math.floor(sideSeat / this.SIDE_SEATS_PER_ROW) + 1} · ${sideNames[sideSeat % this.SIDE_SEATS_PER_ROW]}`;
    }
    const row = Math.floor(guest.seat / this.SEAT_COLS) + 1;
    const col = (guest.seat % this.SEAT_COLS) + 1;
    return `Hàng ${row} · Ghế ${col}`;
  }

  private danceActionName(action: string): string {
    return this.danceActions.find((item) => item.id === action)?.name ?? 'Đang nhảy';
  }

  // ══════════════════════════════════════
  //   CHAT (Panel: 'chat') - Xử lý hoàn toàn ở Backend
  // ══════════════════════════════════════
  sendChat(): void {
    if (!this.chatApproved) {
      this.toast('Khung chat đang chờ duyệt thanh toán.');
      return;
    }
    if (!this.connected || !this.sessionId) {
      this.toast('Phòng đang kết nối lại. Tin nhắn chưa được gửi, vui lòng thử lại.');
      return;
    }
    const text = this.footerChatControl.value.trim();
    if (!text || text.length > 100) return;
    this.chatService.sendMessage(text, this.activeChatFrameTier);
    this.footerChatControl.reset('');
    this.panelChatControl.reset('', { emitEvent: false });
    this.cdr.markForCheck();
  }

  toggleChatEmojiPicker(target: 'footer' | 'panel'): void {
    this.chatEmojiPicker = this.chatEmojiPicker === target ? null : target;
    this.cdr.markForCheck();
  }

  insertChatEmoji(emoji: string): void {
    const current = this.footerChatControl.value;
    if (current.length + emoji.length > 100) {
      this.toast('Tin nhắn đã đủ 100 ký tự.');
      return;
    }
    // Hai ô chat dùng chung nội dung nên emoji cũng xuất hiện ở cả hai ô.
    this.footerChatControl.setValue(`${current}${emoji}`);
    this.chatEmojiPicker = null;
    this.cdr.markForCheck();
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  openCharacterEntry(): void {
    this.characterEntryOpen = true;
  }

  confirmCharacterEntry(selection: CharacterEntrySelection): void {
    this.guestName = selection.displayName;
    this.characterGender = selection.gender;
    this.characterColorIndex = selection.shirtColorIndex;
    this.characterShirtColor = SHIRT_COLORS[selection.shirtColorIndex].hex;
    this.wardrobe = {
      ...this.wardrobe,
      displayName: selection.displayName,
      gender: selection.gender,
      characterShirtColorIndex: selection.shirtColorIndex,
      characterShirtColor: this.characterShirtColor,
    };

    if (this.currentUser) {
      this.currentUser.displayName = selection.displayName;
      this.currentUser.shirtColorIndex = selection.shirtColorIndex;
      this.currentUser.gender = selection.gender;
      try {
        localStorage.setItem('healing_user', JSON.stringify(this.currentUser));
      } catch {}
      if (!this.currentUser.id.startsWith('guest-')) {
        void this.authApi
          .updateProfile({
            userId: this.currentUser.id,
            displayName: selection.displayName,
            avatar: this.currentUser.avatar,
            shirtColorIndex: selection.shirtColorIndex,
            accessoryIndex: this.wardrobe.accessoryIndex,
            hairColorIndex: this.wardrobe.hairColorIndex ?? 0,
            vipTier: this.myVipTier,
          })
          .catch(() => undefined);
      }
    }

    try {
      localStorage.setItem(WARDROBE_KEY, JSON.stringify(this.wardrobe));
    } catch {}
    if (this.connected) {
      this.roomSocket.updateProfile(
        this.guestName,
        this.selectedAvatar,
        selection.shirtColorIndex,
        this.wardrobe.accessoryIndex,
        this.wardrobe.hairColorIndex ?? 0,
        this.activeChatFrameTier,
        selection.gender,
        this.characterShirtColor,
        this.equippedShirtTier,
      );
    }

    this.characterEntryOpen = false;
    this.activePanelId = 'seats';
    void this.refreshTaskProgress();
    this.cdr.markForCheck();
  }

  sendReactionEmoji(emoji: string): void {
    this.chatService.sendReaction(emoji);
    this.toast(emoji);
    this.cdr.markForCheck();
  }

  chooseDanceAction(action: 'sway' | 'bounce' | 'spin' | 'groove'): void {
    if (!this.connected) {
      this.toast('Đang kết nối tới rạp. Thử lại sau giây lát nhé.');
      return;
    }
    if (!this.sessionId) return;
    if (this.danceReturnSeat === null) this.danceReturnSeat = this.mySeat;
    this.roomSocket.sendDanceAction(action, this.danceReturnSeat);
  }

  returnFromDanceFloor(): void {
    if (!this.connected) return;
    this.roomSocket.sendDanceAction('idle', this.danceReturnSeat ?? this.mySeat);
    this.danceReturnSeat = null;
  }

  get myDanceAction(): string {
    return this.state?.guests.find((guest) => guest.id === this.sessionId)?.action ?? 'idle';
  }

  // ══════════════════════════════════════
  //   WARDROBE EQUIPMENT & AUTHENTICATION
  // ══════════════════════════════════════
  frameColorForTier(tier: number): string {
    return (
      ['#a9b0a7', '#f2c46d', '#6cb4ff', '#ff7a7a', '#b79cff', '#5fe3c0', '#ffb347'][tier] ??
      '#a9b0a7'
    );
  }

  frameNameForTier(tier: number): string {
    return (
      [
        'Mặc định',
        'Đồng Cỏ Mây',
        'Ánh Trăng Bạc',
        'Hoàng Kim Vương Giả',
        'Tinh Vân Kim Cương',
        'Hỏa Long Bảo Châu',
        'Thần Long Hoàng Gia',
      ][tier] ?? 'Mặc định'
    );
  }

  onWardrobeAppearanceChanged(appearance: {
    frame: WardrobeCatalogItem;
    shirt: WardrobeCatalogItem;
  }): void {
    this.equippedFrameItem = appearance.frame;
    this.equippedShirtItem = appearance.shirt;
    this.equippedFrameTier = appearance.frame.tier;
    this.equippedShirtTier = appearance.shirt.tier;
    this.characterColorIndex = Math.min(5, appearance.shirt.tier);
    this.characterShirtColor = appearance.shirt.shirtColor;
    this.activeChatFrameTier = appearance.frame.tier;
    this.wardrobe = {
      ...this.wardrobe,
      shirtColorIndex: appearance.shirt.tier,
      characterShirtColorIndex: this.characterColorIndex,
      characterShirtColor: this.characterShirtColor,
      gender: this.characterGender,
    };

    try {
      localStorage.setItem(WARDROBE_KEY, JSON.stringify(this.wardrobe));
      localStorage.setItem(
        this.wardrobeEquipmentStorageKey(),
        JSON.stringify({ frameTier: this.equippedFrameTier, shirtTier: this.equippedShirtTier }),
      );
    } catch {}

    if (this.currentUser) {
      this.currentUser.shirtColorIndex = appearance.shirt.tier;
      try {
        localStorage.setItem('healing_user', JSON.stringify(this.currentUser));
      } catch {}
      if (!this.currentUser.id.startsWith('guest-')) {
        void this.authApi
          .updateProfile({
            userId: this.currentUser.id,
            displayName: this.guestName,
            avatar: this.currentUser.avatar,
            shirtColorIndex: appearance.shirt.tier,
            accessoryIndex: this.wardrobe.accessoryIndex,
            hairColorIndex: this.wardrobe.hairColorIndex ?? 0,
            vipTier: this.myVipTier,
          })
          .catch(() => undefined);
      }
    }

    if (this.connected && this.sessionId) {
      this.roomSocket.updateProfile(
        this.guestName,
        this.selectedAvatar,
        appearance.shirt.tier,
        this.wardrobe.accessoryIndex,
        this.wardrobe.hairColorIndex ?? 0,
        appearance.frame.tier,
        this.characterGender,
        this.characterShirtColor,
        this.equippedShirtTier,
      );
    }
    this.cdr.markForCheck();
  }

  private wardrobeEquipmentStorageKey(): string {
    return `healing_wardrobe_equipment_${this.currentUser?.id ?? (this.clientId || 'guest')}`;
  }

  private loadWardrobeEquipment(): void {
    this.equippedFrameTier = 0;
    this.equippedShirtTier = 0;
    this.activeChatFrameTier = 0;
    this.equippedFrameItem = null;
    this.equippedShirtItem = null;
    try {
      const saved = localStorage.getItem(this.wardrobeEquipmentStorageKey());
      if (saved) {
        const equipment = JSON.parse(saved) as { frameTier?: number; shirtTier?: number };
        this.equippedFrameTier = Math.min(6, Math.max(0, Number(equipment.frameTier) || 0));
        this.equippedShirtTier = Math.min(6, Math.max(0, Number(equipment.shirtTier) || 0));
        this.activeChatFrameTier = this.equippedFrameTier;
        this.wardrobe = { ...this.wardrobe, shirtColorIndex: this.equippedShirtTier };
      }
    } catch {
      this.equippedFrameTier = 0;
      this.equippedShirtTier = 0;
    }
    this.wardrobe = { ...this.wardrobe, shirtColorIndex: this.equippedShirtTier };
  }

  onWardrobePurchase(tier: number): void {
    this.activeChatFrameTier = tier;
    this.equippedFrameTier = tier;
    this.equippedShirtTier = tier;
    void this.refreshChatAccess();
    void this.refreshWallet();
    void this.refreshTaskProgress();
    this.toast('Đã mở bộ vật phẩm. Áo và khung chat đã được trang bị.');
    this.addNotification(
      'Mua vật phẩm thành công',
      'Bộ vật phẩm đã được mở và trang bị cho nhân vật.',
      'success',
    );
    this.cdr.markForCheck();
  }

  private setWardrobeDisplayName(name: string): void {
    this.wardrobe = { ...this.wardrobe, displayName: name };
  }

  switchAuthStep(step: 'login' | 'register'): void {
    this.authStep = step;
    this.authError = '';
    this.cdr.markForCheck();
  }

  openAuthModal(step: 'login' | 'register' = 'login'): void {
    this.authStep = step;
    this.authModalOpen = true;
    this.authError = '';
    this.cdr.markForCheck();
  }

  completeAuthentication(data: AuthResponse): void {
    localStorage.setItem('healing_token', data.token);
    localStorage.setItem('healing_user', JSON.stringify(data.user));
    this.currentUser = data.user;
    this.myVipLevel = Math.max(0, Math.min(10, data.user.vipTier ?? 0));
    this.paymentStatusesInitialized = false;
    this.activateNotificationFeed();
    this.walletBalance = 0;
    this.donationTotalConfirmed = 0;
    this.experiencePoints = 0;
    void this.refreshWalletAndExperience();
    this.startWalletRefresh();
    this.guestName = data.user.displayName || data.user.username;
    this.selectedAvatar = data.user.avatar || '🧸';
    this.wardrobe.shirtColorIndex = data.user.shirtColorIndex ?? 0;
    this.characterGender = data.user.gender ?? this.wardrobe.gender ?? 'male';
    this.characterColorIndex = Math.max(
      0,
      Math.min(5, this.wardrobe.characterShirtColorIndex ?? data.user.shirtColorIndex ?? 2),
    );
    this.wardrobe.gender = this.characterGender;
    this.wardrobe.accessoryIndex = data.user.accessoryIndex ?? 0;
    this.wardrobe.hairColorIndex = data.user.hairColorIndex ?? 0;
    this.setWardrobeDisplayName(this.guestName);
    this.loadWardrobeEquipment();
    this.authModalOpen = false;
    this.authError = '';
    if (this.currentRoom !== 'lobby') this.connectToCinema();
    this.cdr.markForCheck();
  }

  guestQuickLogin(): void {
    if (this.walletRefreshTimer) clearInterval(this.walletRefreshTimer);
    this.walletRefreshTimer = undefined;
    this.walletBalance = 0;
    this.donationTotalConfirmed = 0;
    this.experiencePoints = 0;
    const guestId = Math.floor(10 + Math.random() * 90);
    const name = 'Guest';
    const token = 'guest-' + crypto.randomUUID();
    const guestUser: UserProfile = {
      id: 'guest-' + crypto.randomUUID(),
      username: `guest_${guestId}`,
      displayName: name,
      avatar: this.avatarList[Math.floor(Math.random() * this.avatarList.length)],
      shirtColorIndex: 0,
      accessoryIndex: Math.floor(Math.random() * this.accessories.length),
    };
    localStorage.setItem('healing_token', token);
    localStorage.setItem('healing_user', JSON.stringify(guestUser));
    this.currentUser = guestUser;
    this.myVipLevel = 0;
    this.activateNotificationFeed();
    this.guestName = name;
    this.selectedAvatar = guestUser.avatar;
    this.wardrobe.shirtColorIndex = guestUser.shirtColorIndex;
    this.wardrobe.accessoryIndex = guestUser.accessoryIndex;
    this.setWardrobeDisplayName(name);
    this.loadWardrobeEquipment();
    this.authModalOpen = false;
    if (this.currentRoom !== 'lobby') this.connectToCinema();
    this.cdr.markForCheck();
  }

  copyText(text: string, label: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.toast(`Đã copy ${label}: ${text} `);
        })
        .catch(() => this.copyTextFallback(text, label));
    } else {
      this.copyTextFallback(text, label);
    }
  }

  private copyTextFallback(text: string, label: string): void {
    if (typeof document === 'undefined') {
      this.toast('Trình duyệt không hỗ trợ sao chép tự động.');
      return;
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    this.toast(copied ? `Đã copy ${label}: ${text} ` : `Không thể copy ${label}.`);
  }

  get chatApproved(): boolean {
    return true;
  }
  get canChat(): boolean {
    return this.chatApproved && this.connected && !!this.sessionId;
  }

  private syncChatFormState(): void {
    const controls = [this.footerChatControl, this.panelChatControl];
    for (const control of controls) {
      if (this.canChat && control.disabled) control.enable({ emitEvent: false });
      else if (!this.canChat && control.enabled) control.disable({ emitEvent: false });
    }
  }

  async refreshChatAccess(): Promise<void> {
    if (
      !this.currentUser ||
      this.currentUser.id.startsWith('guest-') ||
      this.isRefreshingChatStatus
    )
      return;
    this.isRefreshingChatStatus = true;
    try {
      const response = await this.paymentApi.getStatus(
        this.currentUser.id,
        localStorage.getItem('healing_token') ?? '',
      );
      if (response.status === 401) {
        this.handleExpiredSession();
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      const previousPrivateRoomCodes = new Set(this.privateRoomCodes.map((room) => room.code));
      const previousVipStatus = this.vipPaymentStatus;
      const previousPrivateRoomStatus = this.privateRoomPaymentStatus;
      const previousDonationStatus = this.donationPaymentStatus;
      this.chatAccessStatus = data.status;
      this.vipPaymentStatus = data.vipPaymentStatus || data.status || 'NONE';
      this.privateRoomPaymentStatus = data.privateRoomStatus || 'NONE';
      this.donationPaymentStatus = data.donationStatus || 'NONE';
      this.privateRoomPending = Boolean(data.privateRoomPending);
      this.privateRoomCodes = Array.isArray(data.privateRooms)
        ? data.privateRooms.filter(
            (room: unknown): room is PrivateRoomView =>
              !!room &&
              typeof room === 'object' &&
              typeof (room as PrivateRoomView).code === 'string' &&
              typeof (room as PrivateRoomView).name === 'string',
          )
        : [];
      const newlyApprovedRoom = this.privateRoomCodes.find(
        (room) => !previousPrivateRoomCodes.has(room.code),
      );
      if (this.paymentStatusesInitialized) {
        this.notifyPaymentStatus(previousVipStatus, this.vipPaymentStatus, 'Giao dịch VIP');
        this.notifyPaymentStatus(
          previousPrivateRoomStatus,
          this.privateRoomPaymentStatus,
          'Tạo phòng riêng',
          newlyApprovedRoom?.name,
        );
        this.notifyPaymentStatus(
          previousDonationStatus,
          this.donationPaymentStatus,
          'Giao dịch ủng hộ',
        );
      }
      this.paymentStatusesInitialized = true;
      this.myVipTier = Number(data.tier) || 0;
      this.myVipLevel = Math.max(0, Math.min(10, Number(data.vipLevel) || 0));
      if (this.currentUser && this.currentUser.vipTier !== this.myVipLevel) {
        this.currentUser = { ...this.currentUser, vipTier: this.myVipLevel };
        localStorage.setItem('healing_user', JSON.stringify(this.currentUser));
      }
      const ownedTiers = Array.isArray(data.tiers)
        ? data.tiers.map((tier: unknown) => Number(tier)).filter(Number.isInteger)
        : [];
      const ownedThroughTier = Math.max(this.myVipTier, ...ownedTiers, 0);
      if (this.equippedFrameTier > ownedThroughTier || this.equippedShirtTier > ownedThroughTier) {
        if (this.equippedFrameTier > ownedThroughTier) {
          this.equippedFrameTier = 0;
          this.activeChatFrameTier = 0;
          this.equippedFrameItem = null;
        }
        if (this.equippedShirtTier > ownedThroughTier) {
          this.equippedShirtTier = 0;
          this.equippedShirtItem = null;
        }
        this.wardrobe = { ...this.wardrobe, shirtColorIndex: this.equippedShirtTier };
        localStorage.setItem(
          this.wardrobeEquipmentStorageKey(),
          JSON.stringify({ frameTier: this.equippedFrameTier, shirtTier: this.equippedShirtTier }),
        );
      }
      if (
        (this.vipPaymentStatus === 'PENDING' ||
          this.privateRoomPending ||
          this.donationPaymentStatus === 'PENDING') &&
        !this.chatStatusTimer
      ) {
        this.chatStatusTimer = setInterval(() => void this.refreshChatAccess(), 5000);
      } else if (
        this.vipPaymentStatus !== 'PENDING' &&
        !this.privateRoomPending &&
        this.donationPaymentStatus !== 'PENDING' &&
        this.chatStatusTimer
      ) {
        clearInterval(this.chatStatusTimer);
        this.chatStatusTimer = undefined;
      }
      this.cdr.markForCheck();
    } catch {
      // Lỗi mạng tạm thời không làm mất phiên đăng nhập.
    } finally {
      this.isRefreshingChatStatus = false;
    }
  }

  private handleExpiredSession(): void {
    if (!this.currentUser) return;
    localStorage.removeItem('healing_token');
    localStorage.removeItem('healing_user');
    if (this.chatStatusTimer) clearInterval(this.chatStatusTimer);
    this.chatStatusTimer = undefined;
    if (this.walletRefreshTimer) clearInterval(this.walletRefreshTimer);
    this.walletRefreshTimer = undefined;
    this.walletBalance = 0;
    this.donationTotalConfirmed = 0;
    this.experiencePoints = 0;
    this.currentUser = null;
    this.paymentStatusesInitialized = false;
    this.activateNotificationFeed();
    this.myVipTier = 0;
    this.myVipLevel = 0;
    this.equippedFrameTier = 0;
    this.equippedShirtTier = 0;
    this.activeChatFrameTier = 0;
    this.equippedFrameItem = null;
    this.equippedShirtItem = null;
    this.chatAccessStatus = 'NONE';
    this.cinemaChatOpen = false;
    this.roomSocket.disconnect();
    this.authError = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    this.authStep = 'login';
    this.authModalOpen = true;
    this.toast(this.authError);
    this.cdr.markForCheck();
  }

  toggleCinemaChat(): void {
    this.cinemaChatOpen = !this.cinemaChatOpen;
    this.cdr.markForCheck();
  }

  toggleCinemaChatMinimize(): void {
    this.cinemaChatMinimized = !this.cinemaChatMinimized;
    this.cdr.markForCheck();
  }

  logout(): void {
    localStorage.removeItem('healing_token');
    localStorage.removeItem('healing_user');
    if (this.chatStatusTimer) clearInterval(this.chatStatusTimer);
    this.chatStatusTimer = undefined;
    if (this.walletRefreshTimer) clearInterval(this.walletRefreshTimer);
    this.walletRefreshTimer = undefined;
    this.walletBalance = 0;
    this.donationTotalConfirmed = 0;
    this.experiencePoints = 0;
    this.currentUser = null;
    this.paymentStatusesInitialized = false;
    this.activateNotificationFeed();
    this.myVipTier = 0;
    this.myVipLevel = 0;
    this.equippedFrameTier = 0;
    this.equippedShirtTier = 0;
    this.activeChatFrameTier = 0;
    this.equippedFrameItem = null;
    this.equippedShirtItem = null;
    this.chatAccessStatus = 'NONE';
    this.roomSocket.disconnect();
    this.authError = '';
    this.authStep = 'login';
    this.authModalOpen = true;
    this.toast('Bạn đã đăng xuất khỏi rạp.');
    this.cdr.markForCheck();
  }

  // LIKE / HEART
  sendLike(): void {
    this.chatService.sendReaction('❤️');
    this.likeCount++;
    this.triggerLikeAnim();
  }

  private triggerLikeAnim(): void {
    this.likeAnimating = true;
    setTimeout(() => (this.likeAnimating = false), 600);
  }

  // ── Vote skip – xử lý qua Backend (yêu cầu ≥ 90% số người) ──
  voteSkip(): void {
    if (this.hasVotedSkip) {
      this.toast('Bạn đã vote bỏ qua rồi!');
      return;
    }
    this.hasVotedSkip = true;
    this.roomSocket.voteSkip();
    this.toast('Đã gửi vote bỏ qua tới rạp');
  }

  // ── Volume & Mute ──
  onVolumeInput(): void {
    const val = Math.max(0, Math.min(100, Math.round(this.volumeControl.value || 0)));
    this.volumeLevel = val;
    this.isMuted = val === 0;

    // Tác động trực tiếp vào YouTube Player local của máy người này
    if (this.player && this.playerReady) {
      try {
        if (val === 0) {
          this.player.mute();
          this.player.setVolume(0);
        } else {
          this.player.unMute();
          this.player.setVolume(val);
        }
      } catch {}
    }
    this.updatePersonalVideoAudio();

    try {
      localStorage.setItem('healing_volume', String(val));
      localStorage.setItem('healing_muted', String(this.isMuted));
      if (val > 0) {
        localStorage.setItem('healing_prev_volume', String(val));
      }
    } catch {}

    this.updateVolumeCss();
    this.cdr.markForCheck();
  }

  toggleDisco(): void {
    this.discoEnabled = !this.discoEnabled;
    try {
      localStorage.setItem('healing_disco_enabled', String(this.discoEnabled));
    } catch {}
    this.cdr.markForCheck();
  }

  toggleMute(): void {
    if (this.isMuted || this.volumeLevel === 0) {
      // Unmute
      this.isMuted = false;
      if (this.volumeLevel === 0) {
        let saved = 80;
        try {
          const s = localStorage.getItem('healing_prev_volume');
          if (s) saved = Number(s) || 80;
        } catch {}
        this.volumeLevel = saved > 0 ? saved : 80;
      }
      if (this.player && this.playerReady) {
        try {
          this.player.unMute();
          this.player.setVolume(this.volumeLevel);
        } catch {}
      }
      this.updatePersonalVideoAudio();
      try {
        localStorage.setItem('healing_muted', 'false');
        localStorage.setItem('healing_volume', String(this.volumeLevel));
      } catch {}
    } else {
      // Mute
      this.isMuted = true;
      try {
        localStorage.setItem('healing_prev_volume', String(this.volumeLevel));
        localStorage.setItem('healing_muted', 'true');
      } catch {}
      if (this.player && this.playerReady) {
        try {
          this.player.mute();
        } catch {}
      }
      this.updatePersonalVideoAudio();
    }
    this.updateVolumeCss();
    this.cdr.markForCheck();
  }

  unmuteAudio(): void {
    this.audioUnlocked = true;
    this.autoplayBlocked = false;
    this.autoMuted = false;
    this.isMuted = false;
    if (this.volumeLevel === 0) {
      this.volumeLevel = 80;
    }
    if (this.player && this.playerReady) {
      try {
        this.player.playVideo();
        this.player.unMute();
        this.player.setVolume(this.volumeLevel);
      } catch {}
    }
    this.updatePersonalVideoAudio();
    try {
      localStorage.setItem('healing_volume', String(this.volumeLevel));
      localStorage.setItem('healing_muted', 'false');
    } catch {}
    this.updateVolumeCss();
    this.cdr.markForCheck();
  }

  private updatePersonalVideoAudio(): void {
    const video = this.playerHost?.nativeElement.querySelector('video');
    if (!video) return;
    const muted = this.isMuted || this.volumeLevel <= 0 || !this.audioUnlocked;
    video.muted = muted;
    video.volume = Math.max(0, Math.min(1, this.volumeLevel / 100));
    if (!muted && video.paused) void video.play().catch(() => undefined);
  }

  private updateVolumeCss(): void {
    const percent = this.isMuted ? 0 : this.volumeLevel;
    if (this.volumeControl.value !== percent) {
      this.volumeControl.setValue(percent, { emitEvent: false });
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--vol-percent', `${percent}%`);
    }
  }

  // ── Fullscreen ──
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ── Copy room link ──
  copyRoomLink(): void {
    navigator.clipboard.writeText(location.href).then(() => this.toast('Đã copy link phòng!'));
  }

  openPrivateRoom(): void {
    this.mobileActionMenuOpen = false;
    this.privateRoomModalOpen = true;
    if (this.currentUser) {
      void this.refreshChatAccess();
      void this.refreshWallet();
    }
    this.cdr.markForCheck();
  }

  closePrivateRoom(): void {
    this.privateRoomModalOpen = false;
  }

  onPrivateRoomRequestPending(): void {
    this.privateRoomPending = true;
    if (!this.chatStatusTimer) {
      this.chatStatusTimer = setInterval(() => void this.refreshChatAccess(), 5000);
    }
  }

  onPrivateRoomCreated(room: PrivateRoomView): void {
    this.privateRoomCodes = [
      ...this.privateRoomCodes.filter((existing) => existing.code !== room.code),
      room,
    ];
    this.privateRoomPending = false;
    this.walletBalance = Math.max(0, this.walletBalance - 10_000);
  }

  onPrivateRoomWalletRefresh(): void {
    void this.refreshWallet();
  }

  onPrivateRoomSessionExpired(): void {
    this.handleExpiredSession();
  }

  onPrivateRoomNotice(notice: {
    message: string;
    title?: string;
    kind?: UserNotification['kind'];
  }): void {
    this.toast(notice.message);
    if (notice.title) this.addNotification(notice.title, notice.message, notice.kind ?? 'info');
  }

  enterPrivateRoom(roomCode: string): void {
    const normalizedCode = roomCode.trim();
    if (!/^private-[a-z0-9-]{8,64}$/i.test(normalizedCode)) {
      this.toast('Mã mời phòng riêng không hợp lệ.');
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('room', normalizedCode);
    history.pushState({}, '', url);
    this.mySeat = null;
    try {
      localStorage.removeItem('healing_my_seat');
    } catch {}
    this.pendingVideoId = null;
    clearTimeout(this.pendingVideoTimer);
    this.addingVideo = false;
    this.lastLoadedVideoId = null;
    this.privateRoomModalOpen = false;
    this.connectToCinema(normalizedCode);
    this.toast('Đang vào rạp riêng. Hãy chia sẻ liên kết để mời bạn bè.');
  }

  // ── Send chat (không tự động mở panel bên phải khi chat thanh dưới) ──
  sendChatAndOpen(): void {
    this.sendChat();
  }

  // ══════════════════════════════════════
  //   HELPERS
  // ══════════════════════════════════════
  private parseVideoId(input: string): string | null {
    const value = input.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
    try {
      const url = new URL(value.includes('://') ? value : `https://${value}`);
      const host = url.hostname.replace(/^www\./, '');
      let id = '';
      if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
      else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        id =
          url.searchParams.get('v') ||
          url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ||
          '';
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }

  toast(message: string): void {
    this.toastMessage = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMessage = ''), 2600);
  }

  markNotificationsRead(): void {
    this.notificationStore.markAllRead();
  }

  clearNotifications(): void {
    this.notificationStore.clear();
  }

  onDonationTransactionPending(): void {
    if (!this.chatStatusTimer) {
      this.chatStatusTimer = setInterval(() => void this.refreshChatAccess(), 5000);
    }
    void this.refreshChatAccess();
  }

  onDonationTransactionFailed(message: string): void {
    this.toast(message);
    this.addNotification('Không thể gửi yêu cầu thanh toán', message, 'error');
  }

  private notifyPaymentStatus(
    previous: string,
    current: string,
    label: string,
    roomName?: string,
  ): void {
    if (previous !== 'PENDING' || (current !== 'APPROVED' && current !== 'REJECTED')) return;
    const approved = current === 'APPROVED';
    const subject = roomName ? `Phòng riêng “${roomName}”` : label;
    const message = approved
      ? roomName
        ? `${subject} đã được tạo. Mã phòng đã sẵn sàng để sử dụng.`
        : label === 'Giao dịch ủng hộ'
          ? `${subject} đã được xác nhận thành công. Số dư ví đã được cập nhật.`
          : `${subject} đã được xác nhận thành công.`
      : `${subject} chưa được duyệt. Vui lòng kiểm tra lại thông tin chuyển khoản.`;
    this.toast(message);
    this.addNotification(
      approved ? 'Thanh toán thành công' : 'Thanh toán thất bại',
      message,
      approved ? 'success' : 'error',
    );
    if (approved && label === 'Giao dịch ủng hộ') void this.refreshWallet();
  }

  private activateNotificationFeed(): void {
    const owner = this.currentUser?.id || this.clientId || 'guest';
    this.notificationStore.activate(owner);
  }

  private addNotification(title: string, message: string, kind: UserNotification['kind']): void {
    this.notificationStore.add(title, message, kind);
  }
}
