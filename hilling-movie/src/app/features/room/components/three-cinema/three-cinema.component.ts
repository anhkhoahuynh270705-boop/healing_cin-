import {
  AfterViewInit,
  Component,
  ApplicationRef,
  ChangeDetectorRef,
  ComponentRef,
  EnvironmentInjector,
  ElementRef,
  EventEmitter,
  createComponent,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  Output,
} from '@angular/core';
import * as THREE from 'three';
import { Guest, RoomState } from '../../models';
import { WardrobeApiService } from '../../../wardrobe/data-access/wardrobe-api.service';
import { WardrobeCatalogItem } from '../../../wardrobe/models/wardrobe.model';
import { createCinemaCharacter } from '../../character/cinema-character.factory';
import { WardrobeChatFrameComponent } from '../../../wardrobe/chat-frame/chat-frame.component';
import {
  buildOutdoorStalls,
  createStallOrderObject,
} from '../../outdoor-stalls/outdoor-stall.factory';
import {
  OUTDOOR_STALL_MENUS,
  OutdoorStallMenu,
  StallMenuItem,
} from '../../outdoor-stalls/outdoor-stall.model';
import {
  addIndoorRoom,
  addOutdoorLights,
  addOutdoorRoom,
} from '../../scene-builders/environment.factory';
import { addSpeakers } from '../../scene-builders/speakers.factory';
import {
  createCinemaLoveseat,
  createCinemaSeat,
  createPremiumSeatDecoration,
} from '../../scene-builders/seat.factory';

type CinemaSeatPosition = {
  index: number;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  tableX?: number;
  tableZ?: number;
};

@Component({
  selector: 'app-three-cinema',
  standalone: true,
  template: `
    <div class="three-cinema-wrap" #wrapRef [class.outdoor]="environmentMode === 'outdoor'">
      <canvas #canvasRef></canvas>
      @if (activeStallMenu; as menu) {
        <div class="stall-menu-backdrop" (click)="closeStallMenu()">
          <section
            class="stall-menu-card"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="'Thực đơn ' + menu.name"
            (click)="$event.stopPropagation()"
          >
            <button
              class="stall-menu-close"
              type="button"
              aria-label="Đóng thực đơn"
              (click)="closeStallMenu()"
            >
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <span class="stall-menu-eyebrow">GỌI MÓN TẠI QUẦY</span>
            <h2>{{ menu.name }}</h2>
            <p>Chọn món, nhân vật sẽ mang về bàn cho bạn.</p>
            <div class="stall-menu-items">
              @for (item of menu.items; track item.id) {
                <button class="stall-menu-item" type="button" (click)="orderFromStall(item)">
                  <span class="stall-menu-emoji" aria-hidden="true">{{ item.emoji }}</span>
                  <span class="stall-menu-item-copy">
                    <strong>{{ item.name }}</strong>
                    <small>{{ item.kind === 'food' ? 'Đồ ăn' : 'Nước uống' }}</small>
                  </span>
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
              }
            </div>
          </section>
        </div>
      }
      <div class="camera-view-controls" role="group" aria-label="Góc nhìn trong rạp">
        <button
          type="button"
          [class.active]="cameraView === 'audience'"
          [attr.aria-pressed]="cameraView === 'audience'"
          title="Nhìn khán giả từ phía màn hình"
          (click)="setCameraView('audience')"
        >
          <i class="fa-solid fa-users" aria-hidden="true"></i><span>Khán giả</span>
        </button>
        <button
          type="button"
          [class.active]="cameraView === 'screen'"
          [attr.aria-pressed]="cameraView === 'screen'"
          title="Tập trung vào màn hình"
          (click)="setCameraView('screen')"
        >
          <i class="fa-solid fa-tv" aria-hidden="true"></i><span>Màn hình</span>
        </button>
        <button
          type="button"
          [class.active]="cameraView === 'seat'"
          [attr.aria-pressed]="cameraView === 'seat'"
          title="Góc nhìn từ ghế của bạn"
          (click)="setCameraView('seat')"
        >
          <i class="fa-solid fa-couch" aria-hidden="true"></i><span>Góc ghế</span>
        </button>
      </div>
      <div class="environment-view-controls" role="group" aria-label="Chọn không gian rạp">
        <button
          type="button"
          [class.active]="environmentMode === 'indoor'"
          [attr.aria-pressed]="environmentMode === 'indoor'"
          title="Chuyển sang rạp kín"
          (click)="setEnvironment('indoor')"
        >
          <i class="fa-solid fa-door-closed" aria-hidden="true"></i><span>Rạp kín</span>
        </button>
        <button
          type="button"
          [class.active]="environmentMode === 'outdoor'"
          [attr.aria-pressed]="environmentMode === 'outdoor'"
          title="Chuyển sang rạp ngoài trời"
          (click)="setEnvironment('outdoor')"
        >
          <i class="fa-solid fa-tree" aria-hidden="true"></i><span>Ngoài trời</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .three-cinema-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        /* Để canvas alpha lộ video ở mặt màn chiếu phía dưới. */
        background: transparent;
        transition: background-color 320ms ease;
      }
      .three-cinema-wrap.outdoor {
        /* Nền trời đặt ở .scene-area phía sau cả video lẫn cảnh 3D. */
        background: transparent;
      }
      .stall-menu-backdrop {
        position: absolute;
        inset: 0;
        z-index: 8;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(10, 8, 15, 0.58);
        backdrop-filter: blur(3px);
      }
      .stall-menu-card {
        position: relative;
        width: min(390px, 100%);
        padding: 24px;
        border: 1px solid rgba(239, 200, 147, 0.24);
        border-radius: 18px;
        background: #1b1720;
        color: #f5eee5;
      }
      .stall-menu-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 34px;
        height: 34px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        background: #29232f;
        color: #ddd3e8;
        cursor: pointer;
      }
      .stall-menu-eyebrow {
        color: #d9b47a;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.14em;
      }
      .stall-menu-card h2 {
        margin: 8px 42px 4px 0;
        font-size: 21px;
      }
      .stall-menu-card p {
        margin: 0 0 16px;
        color: #ada4b5;
        font-size: 13px;
      }
      .stall-menu-items {
        display: grid;
        gap: 8px;
      }
      .stall-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 62px;
        padding: 9px 12px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 12px;
        background: #25202b;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition:
          border-color 150ms ease,
          background-color 150ms ease,
          transform 150ms ease;
      }
      .stall-menu-item:hover {
        transform: translateY(-1px);
        border-color: rgba(217, 180, 122, 0.56);
        background: #302836;
      }
      .stall-menu-emoji {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        place-items: center;
        border-radius: 10px;
        background: rgba(217, 180, 122, 0.12);
        font-size: 22px;
      }
      .stall-menu-item-copy {
        display: grid;
        flex: 1;
        gap: 3px;
      }
      .stall-menu-item-copy strong {
        font-size: 13px;
      }
      .stall-menu-item-copy small {
        color: #a9a0b1;
        font-size: 11px;
      }
      .stall-menu-item > i {
        color: #d9b47a;
        font-size: 12px;
      }
      canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
      .camera-view-controls {
        position: absolute;
        left: calc(var(--left-w, 220px) + 12px);
        bottom: 12px;
        z-index: 5;
        display: flex;
        gap: 5px;
        padding: 5px;
        border: 1px solid rgba(238, 202, 145, 0.35);
        border-radius: 12px;
        background: rgba(16, 12, 24, 0.88);
        pointer-events: auto;
      }
      .environment-view-controls {
        position: absolute;
        right: calc(var(--right-w, 84px) + 12px);
        bottom: 12px;
        z-index: 5;
        display: flex;
        gap: 5px;
        padding: 5px;
        border: 1px solid rgba(238, 202, 145, 0.35);
        border-radius: 12px;
        background: rgba(16, 12, 24, 0.9);
        pointer-events: auto;
      }
      .camera-view-controls button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: rgba(245, 235, 221, 0.78);
        font:
          600 11px/1 system-ui,
          sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      .camera-view-controls button:hover,
      .camera-view-controls button.active {
        border-color: rgba(240, 187, 119, 0.58);
        background: rgba(240, 187, 119, 0.16);
        color: #ffe0a8;
      }
      .camera-view-controls button i {
        font-size: 13px;
      }
      .environment-view-controls button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 0 10px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: rgba(245, 235, 221, 0.78);
        font:
          600 11px/1 system-ui,
          sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      .environment-view-controls button:hover,
      .environment-view-controls button.active {
        border-color: rgba(240, 187, 119, 0.58);
        background: rgba(240, 187, 119, 0.16);
        color: #ffe0a8;
      }
      .environment-view-controls button i {
        font-size: 13px;
      }
      @media (prefers-reduced-motion: reduce) {
        .three-cinema-wrap {
          transition-duration: 1ms !important;
        }
        .camera-view-controls button {
          transition-duration: 1ms !important;
        }
        .environment-view-controls button {
          transition-duration: 1ms !important;
        }
      }
      @media (max-width: 520px) {
        .camera-view-controls {
          left: 10px;
          bottom: 10px;
          gap: 3px;
          padding: 4px;
        }
        .camera-view-controls button {
          gap: 4px;
          min-height: 32px;
          padding: 0 7px;
          font-size: 10px;
        }
        .camera-view-controls button span {
          display: none;
        }
        .camera-view-controls {
          left: 10px;
          max-width: calc(100vw - 20px);
        }
        .environment-view-controls {
          right: calc(var(--right-w, 68px) + 8px);
          bottom: 10px;
          gap: 3px;
          padding: 4px;
        }
        .environment-view-controls button {
          gap: 4px;
          min-height: 32px;
          padding: 0 7px;
          font-size: 10px;
        }
      }
    `,
  ],
})
export class ThreeCinemaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapRef', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  @Input() state: RoomState | null = null;
  @Input() sessionId: string | null = null;
  @Input() discoEnabled = true;
  @Output() seatSelected = new EventEmitter<number>();
  @Output() environmentChanged = new EventEmitter<'indoor' | 'outdoor'>();

  cameraView: 'audience' | 'screen' | 'seat' = 'screen';
  environmentMode: 'indoor' | 'outdoor' = 'indoor';
  activeStallMenu: OutdoorStallMenu | null = null;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private indoorEnvironment = new THREE.Group();
  private outdoorEnvironment = new THREE.Group();
  private environmentRoot = this.indoorEnvironment;
  private camera!: THREE.PerspectiveCamera;
  private readonly cameraTarget = new THREE.Vector3(0, 2.5, -3);
  private cameraViewInitialized = false;
  private cameraTransition?: {
    startedAt: number;
    duration: number;
    fromPosition: THREE.Vector3;
    toPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromFov: number;
    toFov: number;
  };
  private frameId = 0;
  private startTime = 0;
  private resizeObserver?: ResizeObserver;
  private laserLines: THREE.Group[] = [];
  private discoBall?: THREE.Mesh;
  private discoStem?: THREE.Mesh;
  private discoBallCore?: THREE.PointLight;
  private characters: Map<string, THREE.Group> = new Map();
  private readonly danceAnimations = new Map<string, { action: string; phase: number }>();
  private seats: CinemaSeatPosition[] = [];
  private seatMeshes: THREE.Group[] = [];
  private indoorSeats: CinemaSeatPosition[] = [];
  private outdoorSeats: CinemaSeatPosition[] = [];
  private indoorSeatMeshes: THREE.Group[] = [];
  private outdoorSeatMeshes: THREE.Group[] = [];
  private readonly seatGroupsByIndex = new Map<number, Set<THREE.Group>>();
  private readonly seatDecorations = new Map<THREE.Group, { tier: number; group: THREE.Group }>();
  private outdoorStalls: THREE.Group[] = [];
  /** Hitbox đơn giản, tách khỏi hình quầy để không raycast hàng trăm mesh trang trí. */
  private outdoorStallTargets: THREE.Mesh[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private discoLights: THREE.PointLight[] = [];
  private fixedDiscoLights: THREE.PointLight[] = [];
  private walkers: Map<
    string,
    {
      id: string;
      group: THREE.Group;
      waypoints: THREE.Vector3[];
      targetSeatIndex: number;
      targetPos: THREE.Vector3;
      walkStep: number;
      speed: number;
      order?: {
        returning: boolean;
        returnWaypoints: THREE.Vector3[];
        carryObject: THREE.Group;
        tableX: number;
        tableZ: number;
        seatRotation: number;
      };
    }
  > = new Map();
  private servedOrders: Array<{ object: THREE.Group; expiresAt: number }> = [];
  private bubbles: {
    id: string;
    sessionId: string;
    element: HTMLElement;
    frameComponent: ComponentRef<WardrobeChatFrameComponent>;
    expiresAt: number;
  }[] = [];
  private readonly appRef = inject(ApplicationRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly wardrobeApi = inject(WardrobeApiService);
  private readonly pendingBubbles = new Map<string, { text: string; tier: number }>();
  private wardrobeCatalog: WardrobeCatalogItem[] = [];
  private catalogRequest?: Promise<WardrobeCatalogItem[]>;
  private lastFrameTime = 0;

  // ── Mặt chiếu 16:9 dùng chung cho rạp kín và rạp ngoài trời ──
  private screenGroup?: THREE.Group;
  private screenWidth = 27.2;
  private screenHeight = 15.3; // 27.2 * 9 / 16
  private screenFrame?: THREE.Group;

  private get screenCenterY(): number {
    // Giữ cùng cao độ và hướng nhìn để màn trong nhà khớp tuyệt đối với màn ngoài trời.
    return 7.65;
  }

  private readonly ROWS = 6;
  private readonly COLS = 10;
  private readonly SIDE_SEAT_ROWS = 6;
  private readonly SIDE_SEATS_PER_ROW = 4;
  private readonly OUTER_SIDE_SEATS_PER_ROW = 4;
  private readonly SX = 1.22;
  private readonly SZ = 1.65;
  private readonly AISLE_EXTRA = 1.5;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['state'] && this.scene) {
      this.syncGuests();
      if (this.cameraView === 'seat') this.setCameraView('seat');
    }
    if (c['discoEnabled'] && this.scene) this.syncDiscoVisibility();
  }

  ngOnDestroy(): void {
    for (const bubble of this.bubbles) this.destroyBubble(bubble);
    this.bubbles = [];
    for (const walker of this.walkers.values()) {
      if (walker.order) this.disposeCharacter(walker.order.carryObject);
    }
    for (const order of this.servedOrders) this.disposeCharacter(order.object);
    this.walkers.clear();
    this.danceAnimations.clear();
    this.servedOrders = [];
    if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.resizeObserver?.disconnect();
    this.canvasRef?.nativeElement.removeEventListener('pointerdown', this.onCanvasPointerDown);
    this.renderer?.dispose();
  }

  private init(): void {
    if (typeof window === 'undefined') return;
    this.startTime = performance.now();
    const canvas = this.canvasRef.nativeElement;
    const wrap = this.wrapRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    // Dùng Linear Fog để các dãy ghế và người ngồi trong cự ly xem phim (0-20m) luôn rõ nét và không bị phủ tối
    this.scene.fog = new THREE.Fog(0x111827, 26, 68);

    // Góc nhìn thấp hơn – camera xuống thấp, nhìn về phía màn hình nhiều hơn
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
    this.camera.position.set(0, 8.5, 17);
    this.camera.lookAt(this.cameraTarget);

    this.buildScene();
    this.setCameraView('screen');
    this.syncGuests();

    this.resizeObserver = new ResizeObserver(() => this.onResize(wrap));
    this.resizeObserver.observe(wrap);
    this.onResize(wrap);
    this.frameId = requestAnimationFrame(this.animate);
  }

  private buildScene(): void {
    this.addLighting();
    this.environmentRoot = this.indoorEnvironment;
    addIndoorRoom(this.indoorEnvironment);
    this.addDanceFloor(this.indoorEnvironment);

    this.environmentRoot = this.outdoorEnvironment;
    addOutdoorRoom(this.outdoorEnvironment);
    this.addDanceFloor(this.outdoorEnvironment);
    addOutdoorLights(this.outdoorEnvironment);
    const stalls = buildOutdoorStalls(this.outdoorEnvironment);
    this.outdoorStalls = stalls.stalls;
    this.outdoorStallTargets = stalls.targets;

    this.indoorEnvironment.visible = true;
    this.outdoorEnvironment.visible = false;
    this.scene.add(this.indoorEnvironment, this.outdoorEnvironment);

    this.addScreen();
    addSpeakers(this.scene);
    this.addSeats();
    this.addOutdoorCafeSeats();
    this.activateSeatLayout();
    this.addDiscoBallAndLasers();
  }

  private addDanceFloor(root: THREE.Group): void {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshBasicMaterial({ color: 0x9b75e8, transparent: true, opacity: 0.13, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.485, -3.2);
    root.add(floor);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(3.05, 3.16, 48),
      new THREE.MeshBasicMaterial({ color: 0xd4bfff, transparent: true, opacity: 0.52, side: THREE.DoubleSide }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(0, -0.47, -3.2);
    root.add(rim);
  }

  // Ánh sáng toàn rạp ấm và sáng rõ – nhìn rõ từng dãy ghế và người ngồi

  private addLighting(): void {
    // Ambient toàn rạp nâng sáng và ấm hơn
    this.scene.add(new THREE.AmbientLight(0x3e2e54, 3.2));

    // Đèn rọi trần ấm áp rọi thẳng xuống khu vực ghế ngồi khán giả
    const audienceTop = new THREE.DirectionalLight(0xffeedd, 2.2);
    audienceTop.position.set(0, 16, 7);
    audienceTop.target.position.set(0, 0, 2);
    audienceTop.castShadow = true;
    audienceTop.shadow.mapSize.set(1024, 1024);
    this.scene.add(audienceTop);
    this.scene.add(audienceTop.target);

    // Đèn fill ấm từ phía sau khán giả (gần camera) giúp thấy rõ mặt sau ghế và người ngồi
    const audienceFill = new THREE.PointLight(0xffd5b0, 2.4, 32);
    audienceFill.position.set(0, 7.5, 15);
    this.scene.add(audienceFill);

    // Đèn overhead từ trần
    const top = new THREE.DirectionalLight(0x7766bb, 0.8);
    top.position.set(0, 15, -1);
    this.scene.add(top);

    // Ánh sáng màn hình chiếu ra phía khán giả
    const screenGlow = new THREE.PointLight(0x7766ee, 4.0, 28);
    screenGlow.position.set(0, 6.5, -6.5);
    this.scene.add(screenGlow);

    // Thêm một PointLight nữa từ màn hình chiếu thấp chiếu lên mặt khán giả
    const screenLow = new THREE.PointLight(0x9988ff, 2.2, 22);
    screenLow.position.set(0, 2.5, -5.5);
    this.scene.add(screenLow);

    // 4 đèn màu sắc disco cố định chiếu sáng 4 góc rạp
    const staticColors = [0xff44aa, 0x44aaff, 0xffaa22, 0x44ffcc];
    const staticPos: [number, number, number][] = [
      [-9, 8, -5],
      [9, 8, -5],
      [-9, 8, 4],
      [9, 8, 4],
    ];
    staticColors.forEach((col, i) => {
      const pl = new THREE.PointLight(col, 1.8, 20);
      pl.position.set(...staticPos[i]);
      this.scene.add(pl);
      this.fixedDiscoLights.push(pl);
    });

    // 6 đèn disco động – xoay theo disco ball
    const discoColors = [0xff6699, 0x66ccff, 0xffdd44, 0x66ffcc, 0xdd88ff, 0xff8833];
    discoColors.forEach((col) => {
      const pl = new THREE.PointLight(col, 0, 18); // intensity bắt đầu = 0, sẽ animate
      pl.position.set(0, 9, -5);
      this.scene.add(pl);
      this.discoLights.push(pl);
    });
  }

  private addScreen(): void {
    // Giữ mặt phẳng tham chiếu 16:9 để căn video YouTube; không vẽ viền bao quanh.
    this.screenGroup = new THREE.Group();
    // Nâng tâm màn ngoài trời khỏi mặt đất; rạp kín giữ tâm khớp với ô tường.
    this.screenGroup.position.set(0, this.screenCenterY, -8.35);
    // Màn và khung luôn bám thẳng vào tường; không xoay theo camera.
    this.screenGroup.quaternion.identity();
    this.scene.add(this.screenGroup);

    // Khung gỗ viền vàng dùng chung, gắn cùng mặt phẳng chiếu để ôm sát video ở mọi góc camera.
    this.screenFrame = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x87603d });
    const gold = new THREE.MeshBasicMaterial({ color: 0xffd16a, toneMapped: false });
    const frameParts: Array<[number, number, number, number, number, number]> = [
      [-14.12, 0, 0, 0.7, 16.2, 0.42],
      [14.12, 0, 0, 0.7, 16.2, 0.42],
      [0, 8.1, 0, 28.24, 0.7, 0.42],
      [0, -8.1, 0, 28.24, 0.7, 0.42],
    ];
    for (const [x, y, z, width, height, depth] of frameParts) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wood);
      beam.position.set(x, y, z);
      beam.castShadow = true;
      this.screenFrame.add(beam);
    }

    // Nẹp vàng mảnh ở mặt trong tạo viền rõ nhưng không lấn vào phần hình chiếu.
    for (const x of [-13.67, 13.67]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 15.3, 0.44), gold);
      rail.position.set(x, 0, 0.015);
      this.screenFrame.add(rail);
    }
    for (const y of [-7.72, 7.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(27.34, 0.14, 0.44), gold);
      rail.position.set(0, y, 0.015);
      this.screenFrame.add(rail);
    }
    this.screenGroup.add(this.screenFrame);
  }

  setCameraView(view: 'audience' | 'screen' | 'seat'): void {
    this.cameraView = view;
    if (!this.camera) return;

    const target = new THREE.Vector3();
    const position = new THREE.Vector3();
    const outdoorScreenView = view === 'screen' && this.environmentMode === 'outdoor';
    const targetFov = view === 'audience' ? 62 : outdoorScreenView ? 59 : 55;
    if (view === 'audience') {
      // Đứng phía trước khán đài, gần màn chiếu và nhìn ngược về các hàng ghế.
      position.set(0, 6.2, -5.6);
      target.set(0, 2.4, 1.6);
    } else if (view === 'seat') {
      const ownGuest = this.state?.guests.find((guest) => guest.id === this.sessionId);
      const ownSeat =
        ownGuest?.seat === null || ownGuest?.seat === undefined
          ? undefined
          : this.seats[ownGuest.seat];
      const fallbackSeat = this.seats[2 * this.COLS + 4];
      const seat = ownSeat ?? fallbackSeat;
      position.set(seat?.x ?? 0, (seat?.y ?? -0.14) + 1.55, (seat?.z ?? 1.7) + 0.9);
      target.set(0, this.screenCenterY, -8.35);
    } else {
      // Đặt camera trên trục giữa màn chiếu để nhìn chính diện, không nhìn chéo.
      position.set(0, outdoorScreenView ? 9.2 : 8.8, outdoorScreenView ? 26 : 23);
      target.set(0, this.screenCenterY, -8.35);
    }

    if (!this.cameraViewInitialized) {
      // Đặt góc mặc định ngay lần khởi tạo; các lần bấm sau sẽ nội suy mượt.
      this.camera.position.copy(position);
      this.cameraTarget.copy(target);
      this.camera.fov = targetFov;
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      this.cameraViewInitialized = true;
    } else {
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.cameraTransition = {
        startedAt: performance.now(),
        duration: reduceMotion ? 1 : 640,
        fromPosition: this.camera.position.clone(),
        toPosition: position,
        fromTarget: this.cameraTarget.clone(),
        toTarget: target,
        fromFov: this.camera.fov,
        toFov: targetFov,
      };
    }

    const overlay = this.wrapRef.nativeElement
      .closest('.scene-area')
      ?.querySelector('.cinema-screen-overlay') as HTMLElement | null;
    if (overlay) {
      overlay.style.visibility = 'visible';
      overlay.style.opacity = view === 'audience' ? '0' : '1';
    }

    if (!this.cameraTransition && view !== 'audience' && this.screenGroup) {
      this.screenGroup.updateMatrixWorld(true);
      this.updateScreenOverlayProjection();
    }
  }

  setEnvironment(mode: 'indoor' | 'outdoor'): void {
    if (this.environmentMode === mode) return;
    this.closeStallMenu();
    this.environmentMode = mode;
    // Cả hai rạp giữ cùng kích thước video và khung; chỉ độ cao đặt màn khác nhau.
    this.screenWidth = 27.2;
    this.screenHeight = (this.screenWidth * 9) / 16;
    if (this.screenGroup) this.screenGroup.position.y = this.screenCenterY;
    this.indoorEnvironment.visible = mode === 'indoor';
    this.outdoorEnvironment.visible = mode === 'outdoor';
    this.activateSeatLayout();
    this.syncGuests();
    this.syncDiscoVisibility();
    this.setCameraView(this.cameraView);
    this.onResize(this.wrapRef.nativeElement);
    this.environmentChanged.emit(mode);
  }

  private getColX(c: number): number {
    // Block giữa 4 ghế: c = 3, 4, 5, 6 đối xứng qua trục giữa (x = 0)
    if (c >= 3 && c <= 6) {
      return (c - 4.5) * this.SX;
    }
    // Block trái 3 ghế: c = 0, 1, 2 (cách block giữa bằng lối đi 1)
    if (c <= 2) {
      return -2.5 * this.SX - this.AISLE_EXTRA - (2 - c) * this.SX;
    }
    // Block phải 3 ghế: c = 7, 8, 9 (cách block giữa bằng lối đi 2)
    return 2.5 * this.SX + this.AISLE_EXTRA + (c - 7) * this.SX;
  }

  private addSeats(): void {
    const seats: { index: number; x: number; y: number; z: number }[] = [];
    const meshes: THREE.Group[] = [];
    // ── Thêm 2 đường dải đèn LED dẫn lối dọc theo 2 lối đi giữa ──
    const aisleX1 = (-1.83 - 4.55) / 2; // ~ -3.19
    const aisleX2 = (1.83 + 4.55) / 2; // ~ +3.19
    const aisleLedMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });

    for (const ax of [aisleX1, aisleX2]) {
      // 2 viền đèn LED vàng ở 2 mép mỗi lối đi
      for (const offset of [-0.72, 0.72]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 11.5), aisleLedMat);
        strip.position.set(ax + offset, -0.49, 2.5);
        this.indoorEnvironment.add(strip);
      }

      // Đèn chiếu sáng hắt ấm trên lối đi
      for (let lz = -1.0; lz <= 6.5; lz += 2.0) {
        const pl = new THREE.PointLight(0xffbe44, 0.8, 4.5);
        pl.position.set(ax, 0.05, lz);
        this.indoorEnvironment.add(pl);
      }
    }

    // ── Tạo các hàng ghế ngồi to, dài, giật cấp theo chiều cao rạp ──
    for (let r = 0; r < this.ROWS; r++) {
      const z = -1.6 + r * this.SZ;
      const y = -0.46 + r * 0.16; // Ghế sau cao hơn ghế trước

      for (let c = 0; c < this.COLS; c++) {
        const x = this.getColX(c);
        const seat = createCinemaSeat(r, c);
        seat.position.set(x, y, z);
        seat.userData['seatIndex'] = r * this.COLS + c;
        this.indoorEnvironment.add(seat);
        meshes.push(seat);
        const index = r * this.COLS + c;
        this.registerSeatGroup(index, seat);
        seats[index] = { index, x, y, z };
      }
    }

    // Hai cột ghế phụ ở mỗi cánh lấp khoảng trống hai bên.
    const sideSeatXs = [-9.6, -8.3, 8.3, 9.6];
    for (let r = 0; r < this.SIDE_SEAT_ROWS; r++) {
      const z = -1.6 + r * this.SZ;
      const y = -0.46 + r * 0.16;
      for (let sideCol = 0; sideCol < this.SIDE_SEATS_PER_ROW; sideCol++) {
        const index = this.ROWS * this.COLS + r * this.SIDE_SEATS_PER_ROW + sideCol;
        const x = sideSeatXs[sideCol];
        const seat = createCinemaSeat(r, this.COLS + sideCol);
        seat.position.set(x, y, z);
        seat.userData['seatIndex'] = index;
        this.indoorEnvironment.add(seat);
        meshes.push(seat);
        this.registerSeatGroup(index, seat);
        seats[index] = { index, x, y, z };
      }
    }

    // Tạo thêm hai cột mỗi bên để lấp khoảng trống sát tường.
    const outerSideXs = [-12.2, -10.9, 10.9, 12.2];
    const outerSideSeatStart =
      this.ROWS * this.COLS + this.SIDE_SEAT_ROWS * this.SIDE_SEATS_PER_ROW + this.COLS;
    for (let r = 0; r < this.SIDE_SEAT_ROWS; r++) {
      const z = -1.6 + r * this.SZ;
      const y = -0.46 + r * 0.16;
      for (let sideCol = 0; sideCol < this.OUTER_SIDE_SEATS_PER_ROW; sideCol++) {
        const index = outerSideSeatStart + r * this.OUTER_SIDE_SEATS_PER_ROW + sideCol;
        const x = outerSideXs[sideCol];
        const seat = createCinemaSeat(r, this.COLS + this.SIDE_SEATS_PER_ROW + sideCol);
        seat.position.set(x, y, z);
        seat.userData['seatIndex'] = index;
        this.indoorEnvironment.add(seat);
        meshes.push(seat);
        this.registerSeatGroup(index, seat);
        seats[index] = { index, x, y, z };
      }
    }

    // Hàng cuối gồm 5 sofa đôi; mỗi nửa sofa vẫn là một ghế riêng có thể chọn.
    const backRow = this.ROWS;
    const backRowZ = -1.6 + backRow * this.SZ;
    const backRowY = -0.46 + backRow * 0.16;
    const backRowSeatStart = this.ROWS * this.COLS + this.SIDE_SEAT_ROWS * this.SIDE_SEATS_PER_ROW;
    const loveseatCenters = [-6.1, -2.9, 0, 2.9, 6.1];
    for (let pair = 0; pair < loveseatCenters.length; pair++) {
      const leftIndex = backRowSeatStart + pair * 2;
      const rightIndex = leftIndex + 1;
      const sofa = createCinemaLoveseat(backRow, pair, leftIndex, rightIndex);
      sofa.position.set(loveseatCenters[pair], backRowY, backRowZ);
      this.indoorEnvironment.add(sofa);
      meshes.push(sofa);
      this.registerSeatGroup(leftIndex, sofa);
      this.registerSeatGroup(rightIndex, sofa);
      seats[leftIndex] = {
        index: leftIndex,
        x: loveseatCenters[pair] - 0.49,
        y: backRowY,
        z: backRowZ,
      };
      seats[rightIndex] = {
        index: rightIndex,
        x: loveseatCenters[pair] + 0.49,
        y: backRowY,
        z: backRowZ,
      };
    }

    this.indoorSeats = seats;
    this.indoorSeatMeshes = meshes;
  }

  /** Dựng bàn tròn quán cà phê và 118 ghế đơn/đôi/ba cho khu ngoài trời. */
  private addOutdoorCafeSeats(): void {
    const floorY = -0.51;
    const woodLeg = new THREE.MeshLambertMaterial({ color: 0x49362c });
    const seatColors = [0x7c5943, 0x66785a, 0x8a6650, 0x626c7b];
    const tableColors = [0x9a704d, 0x805d43, 0xa17a57];
    const singleTables = new Set([1, 35]);
    const doubleTables = new Set([4, 12, 26, 33]);
    const seatPositions: CinemaSeatPosition[] = [];
    const seatMeshes: THREE.Group[] = [];

    const makeCafeChair = (color: number, seatIndex: number): THREE.Group => {
      const chair = new THREE.Group();
      chair.userData['seatIndex'] = seatIndex;
      chair.userData['seatKind'] = 'cafe';
      const cushion = new THREE.MeshLambertMaterial({ color });

      for (const [x, z] of [
        [-0.25, -0.21],
        [0.25, -0.21],
        [-0.25, 0.21],
        [0.25, 0.21],
      ]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.42, 0.065), woodLeg);
        leg.position.set(x, 0.21, z);
        chair.add(leg);
      }

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.62), cushion);
      seat.position.set(0, 0.46, 0);
      chair.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.12), cushion);
      back.position.set(0, 0.86, -0.25);
      chair.add(back);
      const backRail = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.16), woodLeg);
      backRail.position.set(0, 1.22, -0.25);
      chair.add(backRail);
      return chair;
    };

    let seatIndex = 0;
    let tableIndex = 0;
    // Giữ 4 hàng chính, giảm còn 4 bàn ở phía sau và chuyển 6 bàn ra hai bên.
    const tablePositions: Array<{ x: number; z: number }> = [];
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 8; column++) {
        tablePositions.push({ x: -10.5 + column * 3, z: 0.2 + row * 3.3 });
      }
    }
    for (const x of [-4.5, -1.5, 1.5, 4.5]) {
      tablePositions.push({ x, z: 13.4 });
    }
    for (const z of [0.2, 4.6, 9]) {
      tablePositions.push({ x: -16.2, z }, { x: 16.2, z });
    }

    // Xen kẽ bàn 1, 2 và 3 chỗ; tổng cộng 118 vị trí ngồi.
    for (const { x, z } of tablePositions) {
      const table = new THREE.Group();
      table.position.set(x, floorY, z);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.08, 20), woodLeg);
      foot.position.y = 0.05;
      table.add(foot);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.72, 14), woodLeg);
      pedestal.position.y = 0.44;
      table.add(pedestal);
      const topMaterial = new THREE.MeshLambertMaterial({
        color: tableColors[tableIndex % tableColors.length],
      });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 24), topMaterial);
      top.position.y = 0.82;
      table.add(top);
      this.outdoorEnvironment.add(table);

      const count = singleTables.has(tableIndex) ? 1 : doubleTables.has(tableIndex) ? 2 : 3;
      for (let person = 0; person < count; person++) {
        const angle = Math.PI / 2 + (person / count) * Math.PI * 2;
        const chairX = x + Math.cos(angle) * 1.05;
        const chairZ = z + Math.sin(angle) * 1.05;
        const chair = makeCafeChair(seatColors[tableIndex % seatColors.length], seatIndex);
        chair.position.set(chairX, floorY, chairZ);
        // Ghế xoay mặt vào bàn; nhân vật sẽ ngồi cùng hướng.
        const rotation = Math.atan2(-Math.cos(angle), -Math.sin(angle));
        chair.rotation.y = rotation;
        this.outdoorEnvironment.add(chair);
        seatMeshes.push(chair);
        this.registerSeatGroup(seatIndex, chair);
        seatPositions.push({
          index: seatIndex,
          x: chairX,
          y: floorY + 0.46,
          z: chairZ,
          rotation,
          tableX: x,
          tableZ: z,
        });
        seatIndex++;
      }
      tableIndex++;
    }

    this.outdoorSeats = seatPositions;
    this.outdoorSeatMeshes = seatMeshes;
  }

  private activateSeatLayout(): void {
    if (this.environmentMode === 'outdoor') {
      this.seats = this.outdoorSeats;
      this.seatMeshes = this.outdoorSeatMeshes;
    } else {
      this.seats = this.indoorSeats;
      this.seatMeshes = this.indoorSeatMeshes;
    }
  }

  private registerSeatGroup(seatIndex: number, group: THREE.Group): void {
    const groups = this.seatGroupsByIndex.get(seatIndex) ?? new Set<THREE.Group>();
    groups.add(group);
    this.seatGroupsByIndex.set(seatIndex, groups);
  }

  /*Change Seat Appearances */
  private syncSeatAppearances(): void {
    if (!this.state) return;
    const desiredTiers = new Map<THREE.Group, number>();
    for (const guest of this.state.guests) {
      if (guest.seat === null || guest.seat === undefined) continue;
      // Cần có cả bậc được sở hữu và áo bậc tương ứng đang được mặc.
      const tier = Math.min(6, guest.vipTier ?? 0, guest.shirtTier ?? 0);
      if (tier < 5) continue;
      for (const group of this.seatGroupsByIndex.get(guest.seat) ?? []) {
        desiredTiers.set(group, Math.max(desiredTiers.get(group) ?? 0, tier));
      }
    }

    const allGroups = new Set(
      [...this.seatGroupsByIndex.values()].flatMap((groups) => [...groups]),
    );
    for (const seatGroup of allGroups) {
      const tier = desiredTiers.get(seatGroup) ?? 0;
      const current = this.seatDecorations.get(seatGroup);
      if (current?.tier === tier) continue;
      if (current) {
        current.group.parent?.remove(current.group);
        this.disposeCharacter(current.group);
        this.seatDecorations.delete(seatGroup);
      }
      if (tier >= 5) {
        const isCafeChair = seatGroup.userData['seatKind'] === 'cafe';
        const decoration = createPremiumSeatDecoration(tier, isCafeChair ? 0.42 : 0);
        seatGroup.add(decoration);
        this.seatDecorations.set(seatGroup, { tier, group: decoration });
      }
    }
  }

  private readonly onCanvasPointerDown = (event: PointerEvent): void => {
    if (!this.renderer || !this.camera || !this.scene) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.environmentMode === 'outdoor') {
      const stallId = this.raycaster.intersectObjects(this.outdoorStallTargets, false)[0]?.object
        .userData['stallId'];
      if (Number.isInteger(stallId)) {
        // Chỉ render component này ngay khi người dùng bấm quầy.
        this.activeStallMenu = OUTDOOR_STALL_MENUS[stallId as number] ?? null;
        this.changeDetector.detectChanges();
        return;
      }
    }

    const hit = this.raycaster.intersectObjects(this.seatMeshes, true)[0]?.object;
    if (!hit) return;
    let target: THREE.Object3D | null = hit;
    while (target && target.userData['seatIndex'] === undefined) target = target.parent;
    const seatIndex = target?.userData['seatIndex'];
    if (Number.isInteger(seatIndex))
      this.zone.run(() => this.seatSelected.emit(seatIndex as number));
  };

  closeStallMenu(): void {
    this.activeStallMenu = null;
  }

  orderFromStall(item: StallMenuItem): void {
    const menu = this.activeStallMenu;
    const sessionId = this.sessionId;
    if (!menu || !sessionId || this.environmentMode !== 'outdoor') {
      this.closeStallMenu();
      return;
    }

    const character = this.characters.get(sessionId);
    const stall = this.outdoorStalls[menu.id];
    if (!character || !stall || this.walkers.has(sessionId)) {
      this.closeStallMenu();
      return;
    }

    const guestSeat = this.state?.guests.find((guest) => guest.id === sessionId)?.seat;
    let seatIndex = Number.isInteger(guestSeat) ? (guestSeat as number) : -1;
    if (!this.outdoorSeats[seatIndex]) {
      seatIndex = this.outdoorSeats.reduce((closestIndex, seat, index) => {
        const closest = this.outdoorSeats[closestIndex];
        const seatDistance =
          (seat.x - character.position.x) ** 2 + (seat.z - character.position.z) ** 2;
        const closestDistance =
          (closest.x - character.position.x) ** 2 + (closest.z - character.position.z) ** 2;
        return seatDistance < closestDistance ? index : closestIndex;
      }, 0);
    }
    const seat = this.outdoorSeats[seatIndex];
    if (!seat) {
      this.closeStallMenu();
      return;
    }

    const walkingY = Math.max(seat.y + 0.32, 0.24);
    const start = character.position.clone();
    const stallSide = Math.sign(stall.position.x) || 1;
    const counterX = stall.position.x - stallSide * 1.9;
    const outbound: THREE.Vector3[] = [];
    if (Math.abs(start.x) > 0.35) outbound.push(new THREE.Vector3(0, walkingY, start.z));
    if (Math.abs(start.z - stall.position.z) > 0.35) {
      outbound.push(new THREE.Vector3(0, walkingY, stall.position.z));
    }
    outbound.push(new THREE.Vector3(counterX, walkingY, stall.position.z));

    const returning: THREE.Vector3[] = [];
    returning.push(new THREE.Vector3(0, walkingY, stall.position.z));
    if (Math.abs(seat.z - stall.position.z) > 0.35) {
      returning.push(new THREE.Vector3(0, walkingY, seat.z - 0.04));
    }
    returning.push(new THREE.Vector3(seat.x, walkingY, seat.z - 0.04));

    const carryObject = createStallOrderObject(item);
    this.walkers.set(sessionId, {
      id: sessionId,
      group: character,
      waypoints: outbound,
      targetSeatIndex: seat.index,
      targetPos: new THREE.Vector3(seat.x, seat.y + 0.12, seat.z - 0.04),
      walkStep: 0,
      speed: 4.6,
      order: {
        returning: false,
        returnWaypoints: returning,
        carryObject,
        tableX: seat.tableX ?? seat.x,
        tableZ: seat.tableZ ?? seat.z,
        seatRotation: seat.rotation ?? Math.PI,
      },
    });
    this.closeStallMenu();
  }

  private addDiscoBallAndLasers(): void {
    // ── Dây treo từ trần nhà xuống phía trước rạp (z = -1.5, trước màn hình z = -8.35) ──
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
    this.discoStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), stemMat);
    this.discoStem.position.set(0, 16.9, -1.5);
    this.scene.add(this.discoStem);

    // ── Quả cầu disco treo ở z = -1.5, phía trên mép màn hình, không che khuất tâm video ──
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 1.0,
      roughness: 0.0,
      envMapIntensity: 2.0,
    });
    this.discoBall = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), ballMat);
    this.discoBall.position.set(0, 16.3, -1.5);
    this.scene.add(this.discoBall);

    // Rất nhiều tile gương nhỏ
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0 });
    for (let i = 0; i < 180; i++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.015), tileMat);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI;
      tile.position.setFromSphericalCoords(0.56, ph, th);
      tile.lookAt(0, 0, 0);
      tile.rotateZ(Math.random() * Math.PI);
      this.discoBall.add(tile);
    }

    // Đèn nhỏ sáng trắng ngay tại tâm quả cầu để chiếu phản quang
    this.discoBallCore = new THREE.PointLight(0xffffff, 3.5, 10);
    this.discoBallCore.position.set(0, 16.3, -1.5);
    this.scene.add(this.discoBallCore);

    // ── Laser beams – nhiều hơn, sáng hơn, trải rộng toàn rạp ──
    const laserColors = [
      0xff5599, // hồng đậm
      0x55bbff, // xanh dương
      0xffcc22, // vàng
      0x55ffcc, // xanh lá
      0xdd66ff, // tím
      0xff7733, // cam
      0x88eeff, // cyan
      0xffee55, // vàng chanh
      0xff4477, // đỏ hồng
      0x66ffaa, // xanh mint
      0xbbaaff, // tím nhạt
      0xffaa44, // cam vàng
    ];

    for (const col of laserColors) {
      const glowMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.76,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const beam = new THREE.Group();
      // Lớp ngoài tạo quầng sáng, lõi nhỏ giữ tia rõ nét; hình trụ hiển thị dày trên WebGL.
      beam.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 1, 8, 1, true), glowMat));
      beam.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1, 7, 1, true), coreMat));
      this.scene.add(beam);
      this.laserLines.push(beam);
    }
    this.syncDiscoVisibility();
  }

  private syncDiscoVisibility(): void {
    const visible = this.discoEnabled && this.environmentMode === 'indoor';
    if (this.discoBall) this.discoBall.visible = visible;
    if (this.discoStem) this.discoStem.visible = visible;
    if (this.discoBallCore) this.discoBallCore.visible = visible;
    this.laserLines.forEach((line) => (line.visible = visible));
    this.discoLights.forEach((light) => (light.visible = visible));
    this.fixedDiscoLights.forEach((light) => (light.visible = visible));
  }

  private syncGuests(): void {
    if (!this.state || !this.scene) return;
    this.syncSeatAppearances();
    const live = new Set(this.state.guests.map((g) => g.id));
    for (const [id, grp] of this.characters) {
      if (!live.has(id) && !this.walkers.has(id)) {
        this.scene.remove(grp);
        this.characters.delete(id);
        this.danceAnimations.delete(id);
      }
    }
    for (const guest of this.state.guests) {
      if (this.walkers.has(guest.id)) continue; // Đang đi bộ thì không gián đoạn
      const action = guest.action ?? 'idle';
      const dancing = action !== 'idle';
      const seat =
        guest.seat === null || guest.seat === undefined ? undefined : this.seats[guest.seat];
      const position = (guest.action ?? 'idle') !== 'idle'
        ? this.dancePosition(guest)
        : seat
        ? new THREE.Vector3(seat.x, seat.y + 0.12, seat.z - 0.04)
        : this.standingPosition(guest);

      let grp = this.characters.get(guest.id);
      const existed = !!grp;
      if (
        grp &&
        (grp.userData['shirtIndex'] !== guest.shirtColorIndex ||
          grp.userData['vipTier'] !== guest.vipTier ||
          grp.userData['gender'] !== (guest.gender === 'female' ? 'female' : 'male') ||
          grp.userData['displayName'] !== guest.name ||
          grp.userData['shirtColor'] !== guest.shirtColor ||
          grp.userData['shirtTier'] !== (guest.shirtTier ?? 0))
      ) {
        this.scene.remove(grp);
        this.disposeCharacter(grp);
        this.characters.delete(guest.id);
        grp = undefined;
      }

      if (!grp) {
        grp = this.makeCharacter(
          guest.id,
          guest.shirtColorIndex,
          guest.accessoryIndex,
          guest.hairColorIndex,
          guest.vipTier,
          guest.gender === 'female' ? 'female' : 'male',
          guest.name,
          guest.shirtColor,
          guest.shirtTier,
        );
        this.scene.add(grp);
        this.characters.set(guest.id, grp);
      }

      const previousAction = String(grp.userData['danceAction'] ?? 'idle');
      if (dancing) {
        grp.userData['danceAction'] = action;
        this.danceAnimations.set(guest.id, {
          action,
          phase: this.danceAnimations.get(guest.id)?.phase ?? Math.random() * Math.PI * 2,
        });
        if (!existed) grp.position.copy(position);
        else if (previousAction === 'idle') this.walkToDanceFloor(guest.id, position);
        else grp.position.copy(position);
        grp.rotation.set(0, Math.PI, 0);
        continue;
      }

      if (previousAction !== 'idle') {
        grp.userData['danceAction'] = 'idle';
        grp.userData['danceBaseSet'] = false;
        this.danceAnimations.delete(guest.id);
        for (const partName of [
          'dance-arm-left',
          'dance-arm-right',
          'dance-hand-left',
          'dance-hand-right',
        ]) {
          const part = grp.getObjectByName(partName);
          if (part) {
            part.rotation.set(0, 0, 0);
            if (partName === 'dance-arm-left') part.rotation.z = -0.08;
            if (partName === 'dance-arm-right') part.rotation.z = 0.08;
          }
        }
        if (seat && grp.position.distanceTo(position) > 0.45) {
          this.walkToSeat(
            guest.id,
            guest.seat!,
            guest.shirtColorIndex,
            guest.accessoryIndex,
            guest.hairColorIndex,
            guest.vipTier,
            guest.gender === 'female' ? 'female' : 'male',
            guest.name,
            guest.shirtColor,
            guest.shirtTier,
          );
          continue;
        }
      }
      if (seat && existed && grp.position.distanceTo(position) > 0.65) {
        this.walkToSeat(
          guest.id,
          guest.seat!,
          guest.shirtColorIndex,
          guest.accessoryIndex,
          guest.hairColorIndex,
          guest.vipTier,
          guest.gender === 'female' ? 'female' : 'male',
          guest.name,
          guest.shirtColor,
          guest.shirtTier,
        );
        continue;
      }
      grp.position.copy(position);
      grp.rotation.set(0, seat?.rotation ?? Math.PI, 0);
    }
  }

  private walkToDanceFloor(id: string, target: THREE.Vector3): void {
    const group = this.characters.get(id);
    if (!group || this.walkers.has(id)) return;
    const start = group.position.clone();
    const targetPos = target.clone();
    const aisleX = this.environmentMode === 'outdoor' ? 0 : start.x < 0 ? -3.19 : 3.19;
    const approachY = Math.max(start.y, targetPos.y) + 0.18;
    const waypoints: THREE.Vector3[] = [];
    if (Math.abs(start.x - aisleX) > 0.45) {
      waypoints.push(new THREE.Vector3(aisleX, approachY, start.z));
    }
    waypoints.push(
      new THREE.Vector3(aisleX, approachY, targetPos.z),
      new THREE.Vector3(targetPos.x, approachY, targetPos.z),
      targetPos,
    );
    this.walkers.set(id, {
      id,
      group,
      waypoints,
      targetSeatIndex: -1,
      targetPos,
      walkStep: 0,
      speed: 5.2,
    });
  }

  private dancePosition(guest: Guest): THREE.Vector3 {
    const x = THREE.MathUtils.clamp(Number(guest.x) || 0.5, 0.08, 0.92);
    const row = THREE.MathUtils.clamp(Number(guest.y) || 0.53, 0.18, 0.9);
    return new THREE.Vector3((x - 0.5) * 13, -0.46, -3.2 + (row - 0.53) * 6);
  }

  private standingPosition(guest: Guest): THREE.Vector3 {
    const normalizedX = THREE.MathUtils.clamp(Number(guest.x) || 0.5, 0.08, 0.92);
    const normalizedY = THREE.MathUtils.clamp(Number(guest.y) || 0.5, 0.18, 0.9);
    return new THREE.Vector3((normalizedX - 0.5) * 13, -0.46, -1.3 + normalizedY * 7.5);
  }

  /**
   * Nhân vật đứng lên, đi bộ qua lối đi và ngồi vào ghế mới (chạy ngay lập tức không cần đợi load)
   */
  public walkToSeat(
    id: string,
    targetSeatIndex: number,
    shirtIndex?: number,
    accessoryIndex?: number,
    hairIndex?: number,
    vipTier?: number,
    gender: 'male' | 'female' = 'male',
    displayName = 'Bạn',
    shirtColor = '#9FADD9',
    shirtTier = 0,
  ): void {
    const targetSd = this.seats[targetSeatIndex];
    if (!targetSd) return;

    let grp = this.characters.get(id);
    const targetAisleX = this.environmentMode === 'outdoor' ? 0 : targetSd.x < 0 ? -3.19 : 3.19;

    // Hồ sơ có thể vừa đổi lúc nhân vật đã tồn tại trong scene; dựng lại model
    // trước khi bắt đầu di chuyển để không giữ màu áo/giới tính cũ.
    if (
      grp &&
      (grp.userData['shirtIndex'] !== (shirtIndex ?? -1) ||
        grp.userData['vipTier'] !== (vipTier ?? 0) ||
        grp.userData['gender'] !== gender ||
        grp.userData['displayName'] !== displayName.slice(0, 10) ||
        grp.userData['shirtColor'] !== shirtColor ||
        grp.userData['shirtTier'] !== shirtTier)
    ) {
      this.scene.remove(grp);
      this.disposeCharacter(grp);
      this.characters.delete(id);
      grp = undefined;
    }

    if (!grp) {
      grp = this.makeCharacter(
        id,
        shirtIndex,
        accessoryIndex,
        hairIndex,
        vipTier,
        gender,
        displayName,
        shirtColor,
        shirtTier,
      );
      // Xuất hiện từ cuối lối đi
      grp.position.set(targetAisleX, -0.15, 7.5);
      grp.rotation.set(0, Math.PI, 0);
      this.scene.add(grp);
      this.characters.set(id, grp);
    }

    const startPos = grp.position.clone();
    const startAisleX = this.environmentMode === 'outdoor' ? 0 : startPos.x < 0 ? -3.19 : 3.19;
    const waypoints: THREE.Vector3[] = [];

    // 1. Đứng dậy & bước ra lối đi gần nhất nếu đang ở ghế
    if (Math.abs(startPos.x - startAisleX) > 0.4) {
      waypoints.push(new THREE.Vector3(startAisleX, startPos.y + 0.22, startPos.z));
    }

    // 2. Nếu chuyển từ khối ghế bên này sang bên kia qua lối đi khác
    if (Math.abs(startAisleX - targetAisleX) > 0.5) {
      waypoints.push(new THREE.Vector3(targetAisleX, targetSd.y + 0.32, startPos.z));
    }

    // 3. Đi dọc lối đi tới hàng ghế đích (theo trục Z và cao độ Y của hàng đó)
    waypoints.push(new THREE.Vector3(targetAisleX, targetSd.y + 0.32, targetSd.z - 0.04));

    // 4. Bước ngang vào vị trí ghế đích
    waypoints.push(new THREE.Vector3(targetSd.x, targetSd.y + 0.32, targetSd.z - 0.04));

    this.walkers.set(id, {
      id,
      group: grp,
      waypoints,
      targetSeatIndex,
      targetPos: new THREE.Vector3(targetSd.x, targetSd.y + 0.12, targetSd.z - 0.04),
      walkStep: 0,
      speed: 5.2,
    });
  }

  /** Dùng chung SVG với preview tủ đồ để khung chat phía trên avatar khớp hoàn toàn. */
  public showBubble(
    sessionId: string,
    text: string,
    vipTier = 0,
    equippedFrame?: WardrobeCatalogItem | null,
  ): void {
    if (typeof window === 'undefined') return;
    const wrap = this.wrapRef?.nativeElement;
    if (!wrap) return;

    const tier = Math.min(6, Math.max(0, Number(equippedFrame?.tier ?? vipTier) || 0));
    const item = equippedFrame ?? this.wardrobeCatalog.find((candidate) => candidate.tier === tier);
    if (item) {
      this.renderChatBubble(wrap, sessionId, text, item);
      return;
    }

    // Khung nhận từ API là cấu hình chung; chờ tải catalog một lần rồi render lại đúng mẫu.
    this.pendingBubbles.set(sessionId, { text, tier });
    this.catalogRequest ??= this.wardrobeApi.getCatalog();
    void this.catalogRequest
      .then((catalog) => {
        this.wardrobeCatalog = catalog;
        const pending = [...this.pendingBubbles.entries()];
        this.pendingBubbles.clear();
        for (const [pendingSession, bubble] of pending) {
          const frame = this.wardrobeCatalog.find((candidate) => candidate.tier === bubble.tier);
          if (frame) this.showBubble(pendingSession, bubble.text, bubble.tier, frame);
        }
      })
      .catch(() => {
        this.catalogRequest = undefined;
      });
  }

  private renderChatBubble(
    wrap: HTMLDivElement,
    sessionId: string,
    text: string,
    frameItem: WardrobeCatalogItem,
  ): void {
    const oldIndex = this.bubbles.findIndex((bubble) => bubble.sessionId === sessionId);
    if (oldIndex >= 0) {
      this.destroyBubble(this.bubbles[oldIndex]);
      this.bubbles.splice(oldIndex, 1);
    }

    const element = document.createElement('div');
    element.className = 'cinema-bubble';
    wrap.appendChild(element);

    const frameComponent = createComponent(WardrobeChatFrameComponent, {
      environmentInjector: this.environmentInjector,
    });
    frameComponent.setInput('frameItem', frameItem);
    frameComponent.setInput('message', text);
    this.appRef.attachView(frameComponent.hostView);
    frameComponent.changeDetectorRef.detectChanges();
    element.appendChild(frameComponent.location.nativeElement);

    this.bubbles.push({
      id: Math.random().toString(36),
      sessionId,
      element,
      frameComponent,
      expiresAt: performance.now() + 5500,
    });
  }

  private destroyBubble(bubble: (typeof this.bubbles)[number]): void {
    if (!bubble.frameComponent.hostView.destroyed) {
      this.appRef.detachView(bubble.frameComponent.hostView);
      bubble.frameComponent.destroy();
    }
    bubble.element.remove();
  }

  private makeCharacter(
    id: string,
    shirtIndex?: number,
    accessoryIndex?: number,
    hairIndex?: number,
    vipTier?: number,
    gender: 'male' | 'female' = 'male',
    displayName = 'Bạn',
    shirtColor = '#9FADD9',
    shirtTier = 0,
  ): THREE.Group {
    return createCinemaCharacter({
      id,
      displayName,
      gender,
      shirtColorIndex: shirtIndex ?? -1,
      shirtColor,
      shirtTier,
      accessoryIndex,
      hairColorIndex: hairIndex,
      vipTier,
    });
  }

  private disposeCharacter(character: THREE.Group): void {
    character.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        (material as THREE.MeshBasicMaterial).map?.dispose();
        material.dispose();
      }
    });
  }

  private box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  }

  private readonly animate = (): void => {
    if (typeof requestAnimationFrame === 'undefined') return;
    this.frameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const t = (now - this.startTime) / 1000;
    const delta = this.lastFrameTime > 0 ? Math.min(0.1, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;
    this.updateCameraTransition(now);

    // ── Xử lý chuyển động nhân vật đi bộ tới ghế ──
    for (const [id, w] of this.walkers) {
      if (w.waypoints.length === 0) {
        if (w.order && !w.order.returning) {
          // Nhận món ở quầy rồi quay lại đúng bàn đang ngồi.
          w.order.returning = true;
          w.group.add(w.order.carryObject);
          w.order.carryObject.position.set(0, 0.48, 0.36);
          w.waypoints.push(...w.order.returnWaypoints);
          w.walkStep = 0;
          continue;
        }

        // Đã đến nơi -> đặt nhân vật vào ghế và xoay theo hướng của chỗ ngồi.
        w.group.position.copy(w.targetPos);
        w.group.rotation.set(
          0,
          w.order?.seatRotation ?? this.seats[w.targetSeatIndex]?.rotation ?? Math.PI,
          0,
        );
        if (w.order) {
          w.group.remove(w.order.carryObject);
          this.outdoorEnvironment.add(w.order.carryObject);
          w.order.carryObject.position.set(w.order.tableX, 0.37, w.order.tableZ);
          w.order.carryObject.rotation.set(0, 0, 0);
          this.servedOrders.push({ object: w.order.carryObject, expiresAt: now + 60_000 });
        }
        this.walkers.delete(id);
        continue;
      }

      const nextTarget = w.waypoints[0];
      const dist = w.group.position.distanceTo(nextTarget);

      if (dist < 0.18) {
        w.waypoints.shift();
      } else {
        const dir = nextTarget.clone().sub(w.group.position).normalize();
        w.group.position.addScaledVector(dir, Math.min(dist, w.speed * delta));
        w.walkStep += delta * 14;
        // Nhấp nhô bước chân khi đi bộ
        w.group.position.y = nextTarget.y + Math.abs(Math.sin(w.walkStep)) * 0.08;
        // Xoay hướng theo chiều đang đi
        w.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    for (let index = this.servedOrders.length - 1; index >= 0; index--) {
      const order = this.servedOrders[index];
      if (now < order.expiresAt) continue;
      this.outdoorEnvironment.remove(order.object);
      this.disposeCharacter(order.object);
      this.servedOrders.splice(index, 1);
    }

    // ── Cập nhật toạ độ 2D của bong bóng chat trên đầu nhân vật ──
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.bubbles.length > 0) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        if (now > b.expiresAt) {
          b.element.classList.add('bubble-fade-out');
          setTimeout(() => this.destroyBubble(b), 260);
          this.bubbles.splice(i, 1);
          continue;
        }

        const grp = this.characters.get(b.sessionId);
        if (!grp) {
          b.element.style.display = 'none';
          continue;
        }

        // Toạ độ đỉnh đầu nhân vật trong world space
        const headWorld = grp.position.clone().add(new THREE.Vector3(0, 1.85, 0));
        headWorld.project(this.camera);

        // Nằm phía sau camera
        if (headWorld.z > 1.0) {
          b.element.style.display = 'none';
          continue;
        }

        const sx = (headWorld.x * 0.5 + 0.5) * w;
        const sy = (-headWorld.y * 0.5 + 0.5) * h;
        b.element.style.display = 'block';
        b.element.style.left = `${sx}px`;
        b.element.style.top = `${sy}px`;
      }
    }

    // ── Quay disco ball nhanh hơn ──
    if (this.discoBall) this.discoBall.rotation.y = t * 0.9;

    // ── Disco dynamic lights – xoay vòng quanh rạp ──
    const n = this.discoLights.length;
    this.discoLights.forEach((pl, i) => {
      const a = t * 0.7 + (i / n) * Math.PI * 2;
      const radius = 9;
      pl.position.set(Math.sin(a) * radius, 7.5 + Math.sin(t * 1.2 + i) * 1.5, Math.cos(a) * 5 - 2);
      // Intensity nhấp nháy
      pl.intensity = 2.2 + 1.5 * Math.sin(t * 4 + i * 1.3);
    });

    // ── Laser beams – sweep rộng khắp rạp ──
    const origin = new THREE.Vector3(0, 16.3, -1.5);
    const n2 = this.laserLines.length;
    this.laserLines.forEach((line, i) => {
      // Tia chiều ngang mở rộng tới tận tường
      const a = t * 0.55 + (i / n2) * Math.PI * 2;
      const a2 = t * 0.35 + (i / n2) * Math.PI * 1.7;
      const tx = Math.sin(a) * 12.5; // mở rộng sang 2 bên
      const tz = Math.cos(a2) * 7.0 + 2; // trải dài từ trước ra sau
      const ty = Math.sin(t * 1.5 + i * 0.8) * 0.5 - 0.3; // dao động độ cao nhẹ

      const direction = new THREE.Vector3(tx, ty, tz).sub(origin);
      const length = direction.length();
      line.position.copy(origin).addScaledVector(direction, 0.5);
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      line.scale.set(1, length, 1);

      const shimmer = 0.62 + 0.38 * Math.abs(Math.sin(t * 2.5 + i * 0.9));
      (line.children[0] as THREE.Mesh).material &&
        (((line.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          0.13 * shimmer);
      (line.children[1] as THREE.Mesh).material &&
        (((line.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          0.72 * shimmer);
    });

    // ── Đầu nhân vật nhẹ nhàng gật theo nhạc ──
    this.characters.forEach((grp) => {
      const head = grp.children.find((c) => {
        return c.userData['characterPart'] === 'head';
      });
      if (head) head.position.y = 1.13 + Math.sin(t * 0.7 + grp.position.x) * 0.012;
    });

    this.danceAnimations.forEach(({ action, phase }, id) => {
      const grp = this.characters.get(id);
      if (!grp || this.walkers.has(id)) return;
      if (!grp.userData['danceBaseSet']) {
        grp.userData['danceBaseX'] = grp.position.x;
        grp.userData['danceBaseY'] = grp.position.y;
        grp.userData['danceBaseZ'] = grp.position.z;
        grp.userData['danceBaseRotation'] = grp.rotation.y;
        grp.userData['danceBaseSet'] = true;
      }
      const baseX = Number(grp.userData['danceBaseX']);
      const baseY = Number(grp.userData['danceBaseY']);
      const baseZ = Number(grp.userData['danceBaseZ']);
      const baseRotation = Number(grp.userData['danceBaseRotation']);
      const beat = t * 4.2 + phase;
      const leftArm = grp.getObjectByName('dance-arm-left');
      const rightArm = grp.getObjectByName('dance-arm-right');
      const leftHand = grp.getObjectByName('dance-hand-left');
      const rightHand = grp.getObjectByName('dance-hand-right');

      grp.position.set(baseX, baseY, baseZ);
      grp.rotation.set(0, baseRotation, 0);
      if (action === 'sway') {
        const leftFan = Math.max(0, Math.sin(beat * 0.48));
        const rightFan = Math.max(0, Math.sin(beat * 0.48 + Math.PI));
        const leftFlick = Math.sin(beat * 1.9);
        const rightFlick = Math.sin(beat * 1.9 + Math.PI * 0.65);

        // Hai tay quạt luân phiên thành vòng cung, cổ tay lượn nhẹ ở cuối mỗi nhịp.
        grp.rotation.z = (leftFan - rightFan) * 0.07;
        grp.rotation.y = baseRotation + Math.sin(beat * 0.48) * 0.15;
        grp.position.y = baseY + Math.abs(Math.sin(beat * 0.48)) * 0.035;
        if (leftArm) leftArm.rotation.z = -0.18 - leftFan * 1.85 + Math.sin(beat * 0.48 + 0.4) * 0.12;
        if (rightArm) rightArm.rotation.z = 0.18 + rightFan * 1.85 - Math.sin(beat * 0.48 + 0.4) * 0.12;
        if (leftHand) leftHand.rotation.z = leftFlick * 0.38;
        if (rightHand) rightHand.rotation.z = rightFlick * 0.38;
      } else if (action === 'bounce') {
        const jumpBeat = Math.sin(beat);
        const lift = Math.max(0, jumpBeat);
        const armWave = Math.sin(beat * 2.1);
        const leftHandWave = Math.sin(beat * 4.2 + 0.35);
        const rightHandWave = Math.sin(beat * 4.2 + 1.2);

        // Nén nhẹ lúc tiếp đất rồi bật lên; hai tay vươn cao và cổ tay vẫy theo nhịp.
        grp.position.y = baseY + lift * 0.3 - Math.max(0, -jumpBeat) * 0.025;
        grp.rotation.z = Math.sin(beat * 0.5) * 0.055;
        grp.rotation.y = baseRotation + Math.sin(beat * 0.5) * 0.11;
        if (leftArm) leftArm.rotation.z = -0.2 - lift * 2.15 + armWave * 0.16;
        if (rightArm) rightArm.rotation.z = 0.2 + lift * 2.15 - armWave * 0.16;
        if (leftHand) leftHand.rotation.z = leftHandWave * 0.42;
        if (rightHand) rightHand.rotation.z = rightHandWave * 0.42;
      } else if (action === 'spin') {
        grp.rotation.y = baseRotation + t * 1.65;
        grp.position.y = baseY + Math.abs(Math.sin(beat * 0.5)) * 0.07;
        if (leftArm) leftArm.rotation.z = 0.38;
        if (rightArm) rightArm.rotation.z = -0.38;
      } else if (action === 'groove') {
        grp.rotation.z = Math.sin(beat) * 0.13;
        grp.rotation.y = baseRotation + Math.sin(beat * 0.5) * 0.16;
        grp.position.y = baseY + Math.abs(Math.sin(beat)) * 0.08;
        if (leftArm) leftArm.rotation.z = 0.5 + Math.sin(beat) * 0.3;
        if (rightArm) rightArm.rotation.z = -0.5 - Math.sin(beat + 1.4) * 0.3;
        if (leftHand) leftHand.rotation.z = Math.sin(beat + 0.4) * 0.25;
        if (rightHand) rightHand.rotation.z = Math.sin(beat + 1.4) * 0.25;
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  private onResize(wrap: HTMLElement): void {
    const w = wrap.clientWidth,
      h = wrap.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.renderer.setSize(w, h, false);

    this.updateScreenOverlayProjection();
  }

  private updateCameraTransition(now: number): void {
    const transition = this.cameraTransition;
    if (!transition) return;

    const progress = THREE.MathUtils.clamp(
      (now - transition.startedAt) / transition.duration,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    this.cameraTarget.lerpVectors(transition.fromTarget, transition.toTarget, eased);
    this.camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);

    if (this.cameraView !== 'audience' && this.screenGroup) {
      this.screenGroup.updateMatrixWorld(true);
      this.updateScreenOverlayProjection();
    }

    if (progress >= 1) {
      this.camera.position.copy(transition.toPosition);
      this.cameraTarget.copy(transition.toTarget);
      this.camera.fov = transition.toFov;
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      this.cameraTransition = undefined;

      if (this.cameraView === 'audience') {
        const overlay = this.wrapRef.nativeElement
          .closest('.scene-area')
          ?.querySelector('.cinema-screen-overlay') as HTMLElement | null;
        if (overlay) overlay.style.visibility = 'hidden';
      }
    }
  }

  private updateScreenOverlayProjection(): void {
    if (!this.wrapRef?.nativeElement || !this.camera || !this.screenGroup) return;
    // Biến lớp YouTube thành một mặt phẳng phối cảnh khớp chính xác với lòng khung 3D.
    const wrap = this.wrapRef.nativeElement;
    const overlay = (wrap.closest('.scene-area') || wrap.ownerDocument)?.querySelector(
      '.cinema-screen-overlay',
    ) as HTMLElement | null;
    if (!overlay) return;

    const viewportWidth = wrap.clientWidth;
    const viewportHeight = wrap.clientHeight;
    if (!viewportWidth || !viewportHeight) return;
    // Giữ mặt phẳng nguồn 16:9 để iframe không bị kéo méo trước khi chiếu phối cảnh.
    const sourceWidth = 1600;
    const sourceHeight = 900;

    this.screenGroup.updateMatrixWorld(true);
    const halfWidth = this.screenWidth / 2;
    const halfHeight = this.screenHeight / 2;
    // Cho video ngoài trời tràn nhẹ xuống sau nẹp dưới để không lộ khe nền ở đáy khung.
    const outdoorBottomBleed = this.environmentMode === 'outdoor' ? 0.3 : 0;
    const corners = [
      new THREE.Vector3(-halfWidth, halfHeight, 0),
      new THREE.Vector3(halfWidth, halfHeight, 0),
      new THREE.Vector3(halfWidth, -halfHeight - outdoorBottomBleed, 0),
      new THREE.Vector3(-halfWidth, -halfHeight - outdoorBottomBleed, 0),
    ].map((corner) => corner.applyMatrix4(this.screenGroup!.matrixWorld).project(this.camera));

    // Tọa độ đích theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái.
    const target = corners.map((point) => ({
      x: ((point.x + 1) / 2) * viewportWidth,
      y: ((1 - point.y) / 2) * viewportHeight,
    }));
    const [p0, p1, p2, p3] = target;

    // Tính homography để nội dung video cũng được uốn theo phối cảnh,
    // thay vì chỉ cắt hình chữ nhật khiến video trông nghiêng lệch khỏi khung.
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    const determinant = dx1 * dy2 - dx2 * dy1;
    const perspectiveX = Math.abs(determinant) < 1e-8 ? 0 : (dx3 * dy2 - dx2 * dy3) / determinant;
    const perspectiveY = Math.abs(determinant) < 1e-8 ? 0 : (dx1 * dy3 - dx3 * dy1) / determinant;
    const a = p1.x - p0.x + perspectiveX * p1.x;
    const b = p1.y - p0.y + perspectiveX * p1.y;
    const c = p3.x - p0.x + perspectiveY * p3.x;
    const d = p3.y - p0.y + perspectiveY * p3.y;
    const matrix = [
      a / sourceWidth,
      b / sourceWidth,
      0,
      perspectiveX / sourceWidth,
      c / sourceHeight,
      d / sourceHeight,
      0,
      perspectiveY / sourceHeight,
      0,
      0,
      1,
      0,
      p0.x,
      p0.y,
      0,
      1,
    ];

    // Overlay nguồn 16:9 được ánh xạ vào 4 cạnh trong của viền vàng.
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = `${sourceWidth}px`;
    overlay.style.height = `${sourceHeight}px`;
    overlay.style.transformOrigin = '0 0';
    overlay.style.clipPath = 'none';
    overlay.style.transform = `matrix3d(${matrix.map((value) => value.toFixed(8)).join(',')})`;
  }
}
