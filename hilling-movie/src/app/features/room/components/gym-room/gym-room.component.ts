import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { Guest } from '../../models';
import { createCinemaCharacter } from '../../character/cinema-character.factory';

interface GymEquipment {
  id: string;
  name: string;
  zone: string;
  icon: string;
  targetX: number;
  targetZ: number;
  exercise: 'treadmill' | 'cycle' | 'rower' | 'barbell' | 'cable' | 'legpress' | 'mobility';
}

const ROOM_SPACING = 1.65;

@Component({
  selector: 'app-gym-room',
  standalone: true,
  template: `
    <div class="gym-room-shell">
      <div class="gym-viewport" #viewport aria-label="Phòng gym 3D">
        <canvas #canvas aria-label="Phòng gym 3D có thể kéo để xoay góc nhìn"></canvas>
        <div class="gym-topbar">
          <div class="gym-brand"><span class="gym-brand-icon"><i class="fa-solid fa-dumbbell" aria-hidden="true"></i></span><span><strong>FITNESS CLUB</strong><small>HEALING CINÉ · PHÒNG TẬP</small></span></div>
          <div class="gym-live-pill"><span></span> PHÒNG GYM ĐANG MỞ</div>
          <button type="button" class="gym-return-button" (click)="exitGym.emit()"><i class="fa-solid fa-film" aria-hidden="true"></i> Về rạp phim</button>
        </div>
        <div class="gym-scene-hint"><i class="fa-solid fa-arrow-pointer" aria-hidden="true"></i> Bấm máy để tập · Kéo xoay · Cuộn zoom</div>
        <div class="gym-status-card">
          <span class="gym-status-icon"><i class="fa-solid" [class.fa-person-running]="!activeEquipment" [class.fa-dumbbell]="!!activeEquipment" aria-hidden="true"></i></span>
          <span><strong>{{ activeEquipment ? 'Đang tập: ' + activeEquipment.name : 'Bạn đang ở phòng gym' }}</strong><small>{{ isWalking ? 'Nhân vật đang đi đến thiết bị…' : activeEquipment ? 'Nhân vật đang sử dụng thiết bị' : 'Chọn máy tập bên dưới để nhân vật đi tới và bắt đầu' }}</small></span>
          @if (activeEquipment) { <button type="button" class="gym-rest-button" (click)="rest()">Nghỉ</button> }
        </div>
        <div class="gym-equipment-dock" aria-label="Chọn thiết bị tập luyện">
          <div class="gym-dock-heading"><span><strong>CHỌN THIẾT BỊ</strong><small>Bấm máy trong phòng hoặc chọn tại đây — nhân vật sẽ đi tới và tập</small></span><span class="gym-equipment-count">{{ equipment.length }} thiết bị</span></div>
          <div class="gym-equipment-grid">
            @for (item of equipment; track item.name) {
              <button type="button" class="gym-equipment-card" [class.active]="activeEquipment?.id === item.id" (click)="useEquipment(item)" [attr.aria-pressed]="activeEquipment?.id === item.id">
                <span class="gym-equipment-icon"><i [attr.class]="'fa-solid ' + item.icon" aria-hidden="true"></i></span>
                <span><strong>{{ item.name }}</strong><small>{{ item.zone }}</small></span>
                <i class="fa-solid fa-arrow-right gym-equipment-arrow" aria-hidden="true"></i>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; width:100%; color:#f3f1ed; font-family:'DM Sans',sans-serif; }
    .gym-room-shell { display:flex; flex-direction:column; gap:14px; padding:0 0 18px; }
    .gym-viewport { position:relative; height:255px; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:13px; background:#151d22; touch-action:none; cursor:grab; }
    .gym-viewport:active { cursor:grabbing; }
    canvas { display:block; width:100%; height:100%; outline:0; }
    .gym-scene-badge,.gym-scene-hint { position:absolute; display:flex; align-items:center; gap:7px; padding:7px 9px; border:1px solid rgba(255,255,255,.11); border-radius:7px; background:rgba(9,14,16,.78); color:#e5e8e5; font-size:8px; letter-spacing:.08em; pointer-events:none; backdrop-filter:blur(8px); }
    .gym-scene-badge { top:9px; left:9px; }
    .gym-scene-badge span { width:6px; height:6px; border-radius:50%; background:#8cce8e; box-shadow:0 0 9px #8cce8e; }
    .gym-scene-hint { right:9px; bottom:9px; color:#c2c8c6; letter-spacing:0; font-size:9px; }
    .gym-welcome { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .gym-eyebrow,.gym-section-heading>span { color:#9ab6a1; font-size:8px; font-weight:700; letter-spacing:.15em; }
    .gym-welcome h2 { margin:4px 0 3px; font-size:17px; font-weight:700; letter-spacing:-.03em; }
    .gym-welcome p { color:#a5aaa8; font-size:10px; line-height:1.5; }
    .gym-open-badge { display:flex; align-items:center; gap:5px; flex:none; margin-top:4px; padding:6px 8px; border:1px solid rgba(140,206,142,.18); border-radius:20px; background:rgba(140,206,142,.08); color:#a7d5a7; font-size:8px; }
    .gym-open-badge i { font-size:6px; }
    .gym-floor-stats { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid rgba(255,255,255,.08); border-radius:10px; background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015)); }
    .gym-floor-stats>div { display:grid; grid-template-columns:15px 1fr; align-items:center; column-gap:5px; padding:9px 7px; }
    .gym-floor-stats>div+div { border-left:1px solid rgba(255,255,255,.08); }
    .gym-floor-stats i { grid-row:span 2; color:#a3c6a7; font-size:10px; }
    .gym-floor-stats strong { font-size:11px; }
    .gym-floor-stats small { color:#909794; font-size:8px; }
    .gym-equipment-section { display:grid; gap:8px; }
    .gym-section-heading { display:flex; align-items:center; justify-content:space-between; }
    .gym-section-heading small { color:#8d9592; font-size:9px; }
    .gym-equipment-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
    .gym-equipment-card { min-width:0; display:flex; align-items:center; gap:7px; padding:8px 7px; border:1px solid rgba(255,255,255,.075); border-radius:9px; background:rgba(255,255,255,.025); }
    .gym-equipment-icon { display:grid; place-items:center; flex:none; width:27px; height:27px; border-radius:7px; background:rgba(146,183,151,.1); color:#b8d4b9; font-size:11px; }
    .gym-equipment-card>span:nth-child(2) { min-width:0; display:grid; gap:2px; }
    .gym-equipment-card strong { overflow:hidden; color:#e9e9e5; font-size:9px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
    .gym-equipment-card small { color:#929a96; font-size:8px; }
    .gym-equipment-check { margin-left:auto; color:#82bb87; font-size:8px; }
    .gym-note { display:flex; align-items:flex-start; gap:9px; padding:10px; border:1px solid rgba(217,170,117,.14); border-radius:9px; background:rgba(217,170,117,.055); }
    .gym-note>i { margin-top:2px; color:#d9aa75; font-size:12px; }
    .gym-note span { display:grid; gap:3px; }
    .gym-note strong { color:#ead7be; font-size:9px; }
    .gym-note small { color:#a8a29a; font-size:8px; line-height:1.5; }
    :host { position:absolute; inset:0; z-index:5; width:100%; height:100%; }
    .gym-room-shell,.gym-viewport { position:absolute; inset:0; width:100%; height:100%; }
    .gym-room-shell { display:block; padding:0; }
    .gym-viewport { border:0; border-radius:0; }
    .gym-topbar { position:absolute; z-index:2; top:18px; left:20px; right:20px; display:flex; align-items:center; gap:14px; pointer-events:none; }
    .gym-brand { display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid rgba(255,255,255,.11); border-radius:11px; background:rgba(12,17,18,.78); backdrop-filter:blur(12px); }
    .gym-brand-icon { display:grid; place-items:center; width:31px; height:31px; border-radius:9px; background:rgba(144,190,148,.14); color:#aed2ae; }
    .gym-brand>span:last-child { display:grid; gap:3px; }
    .gym-brand strong { font-size:10px; letter-spacing:.12em; }
    .gym-brand small { color:#99a29d; font-size:8px; letter-spacing:.11em; }
    .gym-live-pill { display:flex; align-items:center; gap:7px; padding:8px 11px; border:1px solid rgba(255,255,255,.1); border-radius:20px; background:rgba(12,17,18,.72); color:#c7cec9; font-size:8px; letter-spacing:.1em; }
    .gym-live-pill span { width:6px; height:6px; border-radius:50%; background:#8cce8e; box-shadow:0 0 9px #8cce8e; }
    .gym-return-button { margin-left:auto; margin-right:96px; display:flex; align-items:center; gap:7px; padding:9px 13px; border:1px solid rgba(237,211,170,.24); border-radius:9px; background:rgba(17,19,18,.84); color:#ecd5b0; font:inherit; font-size:10px; font-weight:700; pointer-events:auto; cursor:pointer; }
    .gym-return-button:hover { background:rgba(75,61,43,.9); }
    .gym-scene-hint { right:110px; bottom:204px; }
    .gym-status-card { position:absolute; left:20px; bottom:204px; display:flex; align-items:center; gap:10px; max-width:min(390px,48%); padding:10px 12px; border:1px solid rgba(255,255,255,.1); border-radius:10px; background:rgba(12,17,18,.8); backdrop-filter:blur(12px); }
    .gym-status-icon { display:grid; place-items:center; flex:none; width:33px; height:33px; border-radius:9px; background:rgba(144,190,148,.12); color:#afd4b0; }
    .gym-status-card>span:nth-child(2) { display:grid; gap:4px; }
    .gym-status-card strong { font-size:10px; }
    .gym-status-card small { color:#a0a8a3; font-size:9px; line-height:1.4; }
    .gym-rest-button { margin-left:8px; padding:6px 10px; border:1px solid rgba(255,255,255,.12); border-radius:7px; background:rgba(255,255,255,.06); color:#e9ece8; font:inherit; font-size:9px; cursor:pointer; }
    .gym-equipment-dock { position:absolute; z-index:2; right:110px; bottom:15px; left:20px; display:grid; gap:9px; padding:12px; border:1px solid rgba(255,255,255,.1); border-radius:13px; background:rgba(11,16,17,.83); backdrop-filter:blur(14px); }
    .gym-dock-heading { display:flex; align-items:center; justify-content:space-between; }
    .gym-dock-heading>span:first-child { display:grid; gap:3px; }
    .gym-dock-heading strong { color:#c5d5c6; font-size:8px; letter-spacing:.14em; }
    .gym-dock-heading small,.gym-equipment-count { color:#939d97; font-size:8px; }
    .gym-equipment-grid { grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; }
    .gym-equipment-card { min-height:48px; padding:6px; background:rgba(255,255,255,.035); color:inherit; text-align:left; cursor:pointer; transition:background .15s,border-color .15s,transform .15s; }
    .gym-equipment-card:hover,.gym-equipment-card.active { border-color:rgba(151,202,154,.42); background:rgba(115,161,120,.14); transform:translateY(-1px); }
    .gym-equipment-icon { width:26px; height:26px; }
    .gym-equipment-card strong { font-size:8px; }
    .gym-equipment-card small { font-size:7px; }
    .gym-equipment-arrow { margin-left:auto; color:#8bb98e; font-size:8px; }
    @media (max-width:760px) {
      .gym-topbar { top:9px; left:8px; right:8px; gap:6px; }
      .gym-return-button { margin-right:0; padding:8px; font-size:0; }
      .gym-return-button i { font-size:12px; }
      .gym-live-pill { display:none; }
      .gym-status-card { left:8px; bottom:calc(34dvh + 76px); max-width:calc(100% - 16px); }
      .gym-scene-hint { top:58px; right:8px; bottom:auto; max-width:48%; }
      .gym-equipment-dock { right:8px; bottom:62px; left:8px; max-height:34dvh; gap:7px; padding:8px; overflow:hidden; }
      .gym-dock-heading small { max-width:54vw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .gym-equipment-grid { grid-template-columns:repeat(3,minmax(0,1fr)); max-height:23dvh; overflow:auto; overscroll-behavior:contain; }
      .gym-equipment-card { min-height:43px; }
    }
    @media (max-width:420px) {
      .gym-brand { gap:7px; padding:7px 9px; }
      .gym-brand-icon { width:27px; height:27px; }
      .gym-brand strong { font-size:9px; }
      .gym-brand small { font-size:7px; }
      .gym-equipment-card { gap:5px; padding:5px; }
      .gym-equipment-icon { width:23px; height:23px; }
      .gym-equipment-card strong { font-size:7px; }
      .gym-equipment-card small { display:none; }
      .gym-status-card { max-width:calc(100% - 16px); padding:8px; }
    }
    @media (orientation:landscape) and (max-height:500px) {
      .gym-status-card { bottom:calc(38dvh + 72px); }
      .gym-scene-hint { top:48px; }
      .gym-equipment-dock { max-height:38dvh; }
      .gym-equipment-grid { grid-template-columns:repeat(4,minmax(0,1fr)); max-height:25dvh; }
      .gym-dock-heading { display:none; }
    }
  `],
})
export class GymRoomComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewport', { static: true }) private viewportRef!: ElementRef<HTMLDivElement>;
  @Input() guest: Guest | null = null;
  @Input() displayName = 'Bạn';
  @Input() active = false;
  @Output() exitGym = new EventEmitter<void>();

  readonly equipment: GymEquipment[] = [
    { id: 'treadmill', name: 'Máy chạy bộ', zone: 'Cardio', icon: 'fa-person-running', targetX: 3.25, targetZ: 1.75, exercise: 'treadmill' },
    { id: 'cycle', name: 'Xe đạp & elliptical', zone: 'Cardio', icon: 'fa-bicycle', targetX: 1.35, targetZ: 1.6, exercise: 'cycle' },
    { id: 'rack', name: 'Power rack', zone: 'Sức mạnh', icon: 'fa-weight-hanging', targetX: -2.95, targetZ: -2.6, exercise: 'barbell' },
    { id: 'smith', name: 'Smith machine', zone: 'Sức mạnh', icon: 'fa-weight-hanging', targetX: -1.55, targetZ: -2.55, exercise: 'barbell' },
    { id: 'cable', name: 'Cable crossover', zone: 'Sức mạnh', icon: 'fa-link', targetX: 0.15, targetZ: -1.65, exercise: 'cable' },
    { id: 'legpress', name: 'Leg press & pulldown', zone: 'Sức mạnh', icon: 'fa-dumbbell', targetX: 0.55, targetZ: 0.1, exercise: 'legpress' },
    { id: 'bench', name: 'Ghế tập đa năng', zone: 'Sức mạnh', icon: 'fa-couch', targetX: -3.05, targetZ: 0.65, exercise: 'barbell' },
    { id: 'dumbbells', name: 'Giàn tạ dumbbell', zone: 'Tạ tự do', icon: 'fa-weight-hanging', targetX: 2.25, targetZ: -2.05, exercise: 'barbell' },
    { id: 'plates', name: 'Barbell & đĩa tạ', zone: 'Tạ tự do', icon: 'fa-circle-nodes', targetX: 1.35, targetZ: -2.1, exercise: 'barbell' },
    { id: 'kettlebell', name: 'Kettlebell', zone: 'Functional', icon: 'fa-weight-hanging', targetX: -4.15, targetZ: 3.35, exercise: 'barbell' },
    { id: 'rower', name: 'Máy chèo thuyền', zone: 'Cardio', icon: 'fa-water', targetX: -1.65, targetZ: 2.6, exercise: 'rower' },
    { id: 'mats', name: 'Thảm & foam roller', zone: 'Mobility', icon: 'fa-grip', targetX: -0.3, targetZ: 3.3, exercise: 'mobility' },
    { id: 'bands', name: 'Dây kháng lực', zone: 'Functional', icon: 'fa-link', targetX: 0.9, targetZ: 3.65, exercise: 'mobility' },
  ];
  activeEquipment: GymEquipment | null = null;
  get isWalking(): boolean {
    return !!this.avatarTarget;
  }

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private resizeObserver?: ResizeObserver;
  private frameId = 0;
  private avatar?: THREE.Group;
  private avatarTarget?: THREE.Vector3;
  private lastFrameTime = 0;
  private azimuth = 0.68;
  private elevation = 0.46;
  private radius = 23;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerStartedOnControl = false;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly equipmentTargets: THREE.Group[] = [];
  private readonly target = new THREE.Vector3(0, 1.05, 0);

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    const viewport = this.viewportRef.nativeElement;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvasRef.nativeElement,
        antialias: true,
        alpha: false,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x151c20);
    this.scene.fog = new THREE.Fog(0x151c20, 25, 48);
    this.camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    this.buildRoom();
    this.placeEquipment();
    this.refreshCharacter();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(viewport);
    viewport.addEventListener('pointerdown', this.onPointerDown);
    viewport.addEventListener('pointermove', this.onPointerMove);
    viewport.addEventListener('pointerup', this.onPointerUp);
    viewport.addEventListener('pointercancel', this.onPointerUp);
    viewport.addEventListener('wheel', this.onWheel, { passive: false });
    this.resize();
    if (this.active) this.frameId = requestAnimationFrame(this.draw);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['guest'] && this.scene) this.refreshCharacter();
    if (changes['displayName'] && this.scene && !this.guest) this.refreshCharacter();
    if (changes['active'] && this.scene) {
      if (this.active) {
        this.resize();
        if (!this.frameId) this.frameId = requestAnimationFrame(this.draw);
      } else {
        if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
          cancelAnimationFrame(this.frameId);
        }
        this.frameId = 0;
      }
    }
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.resizeObserver?.disconnect();
    const viewport = this.viewportRef.nativeElement;
    viewport.removeEventListener('pointerdown', this.onPointerDown);
    viewport.removeEventListener('pointermove', this.onPointerMove);
    viewport.removeEventListener('pointerup', this.onPointerUp);
    viewport.removeEventListener('pointercancel', this.onPointerUp);
    viewport.removeEventListener('wheel', this.onWheel);
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer?.dispose();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerStartedOnControl =
      event.target instanceof Element && !!event.target.closest('button');
    if (this.pointerStartedOnControl) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.viewportRef.nativeElement.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) {
      if (!this.camera) return;
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.viewportRef.nativeElement.style.cursor = this.raycaster.intersectObjects(this.equipmentTargets, true).length
        ? 'pointer'
        : 'grab';
      return;
    }
    this.azimuth -= (event.clientX - this.lastX) * 0.008;
    this.elevation = THREE.MathUtils.clamp(
      this.elevation + (event.clientY - this.lastY) * 0.004,
      0.18,
      0.9,
    );
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.updateCamera();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const moved = Math.hypot(event.clientX - this.pointerStartX, event.clientY - this.pointerStartY);
    this.dragging = false;
    if (this.pointerStartedOnControl || moved > 7 || !this.camera || !this.renderer) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.equipmentTargets, true)[0]?.object;
    let station: THREE.Object3D | null = hit ?? null;
    while (station && typeof station.userData['gymEquipmentId'] !== 'string') {
      station = station.parent;
    }
    const item = this.equipment.find((equipment) => equipment.id === station?.userData['gymEquipmentId']);
    if (item) this.useEquipment(item);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.radius = THREE.MathUtils.clamp(this.radius + event.deltaY * 0.018, 15, 32);
    this.updateCamera();
  };

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const { clientWidth, clientHeight } = this.viewportRef.nativeElement;
    if (!clientWidth || !clientHeight) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  private updateCamera(): void {
    if (!this.camera) return;
    const horizontal = this.radius * Math.cos(this.elevation);
    this.camera.position.set(
      this.target.x + horizontal * Math.sin(this.azimuth),
      this.target.y + this.radius * Math.sin(this.elevation),
      this.target.z + horizontal * Math.cos(this.azimuth),
    );
    this.camera.lookAt(this.target);
    this.renderer?.render(this.scene!, this.camera);
  }

  useEquipment(item: GymEquipment): void {
    this.activeEquipment = item;
    this.updateWorkoutProps(item);
    this.avatarTarget = this.stationPosition(item);
  }

  rest(): void {
    this.activeEquipment = null;
    this.avatarTarget = undefined;
    this.updateWorkoutProps(null);
    this.resetAvatarPose();
  }

  private updateWorkoutProps(item: GymEquipment | null): void {
    if (!this.avatar) return;
    for (const hand of ['left', 'right']) {
      const handMesh = this.avatar.getObjectByName(`dance-hand-${hand}`);
      const existing = handMesh?.getObjectByName('gym-workout-prop');
      if (existing) {
        handMesh?.remove(existing);
        existing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
      }
      if (!handMesh || !item || !['dumbbells', 'kettlebell'].includes(item.id)) continue;

      const prop = new THREE.Group();
      prop.name = 'gym-workout-prop';
      const iron = this.material(0x252a2b, 0.38);
      const grip = this.material(0x8d9692, 0.27);
      if (item.id === 'dumbbells') {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 10), grip);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, -0.03, -0.12);
        prop.add(bar);
        for (const side of [-1, 1]) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.055, 18), iron);
          plate.rotation.z = Math.PI / 2;
          plate.position.set(side * 0.13, -0.03, -0.12);
          prop.add(plate);
        }
      } else {
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), iron);
        bell.scale.set(0.86, 1, 0.85);
        bell.position.set(0, -0.13, -0.12);
        prop.add(bell);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.017, 8, 14, Math.PI), grip);
        handle.position.set(0, -0.035, -0.12);
        handle.rotation.z = Math.PI;
        prop.add(handle);
      }
      handMesh.add(prop);
    }
  }

  private stationPosition(item: GymEquipment): THREE.Vector3 {
    return new THREE.Vector3(item.targetX * ROOM_SPACING, 0, item.targetZ * ROOM_SPACING);
  }

  private refreshCharacter(): void {
    if (!this.scene) return;
    if (
      this.avatar &&
      this.avatar.userData['displayName'] === (this.guest?.name ?? this.displayName).slice(0, 10) &&
      this.avatar.userData['shirtColor'] === (this.guest?.shirtColor ?? '#9fadd9') &&
      this.avatar.userData['shirtTier'] === (this.guest?.shirtTier ?? 0) &&
      this.avatar.userData['shirtIndex'] === (this.guest?.shirtColorIndex ?? 2) &&
      this.avatar.userData['accessoryIndex'] === (this.guest?.accessoryIndex ?? 0) &&
      this.avatar.userData['hairIndex'] === (this.guest?.hairColorIndex ?? 0) &&
      this.avatar.userData['vipTier'] === (this.guest?.vipTier ?? 0) &&
      this.avatar.userData['gender'] === (this.guest?.gender === 'female' ? 'female' : 'male')
    ) return;
    const previousPosition = this.avatar?.position.clone() ?? new THREE.Vector3(0, 0, 5.7);
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    }
    this.avatar = createCinemaCharacter({
      id: this.guest?.id ?? 'gym-player',
      displayName: this.guest?.name ?? this.displayName,
      gender: this.guest?.gender === 'female' ? 'female' : 'male',
      shirtColorIndex: this.guest?.shirtColorIndex ?? 2,
      shirtColor: this.guest?.shirtColor ?? '#9fadd9',
      shirtTier: this.guest?.shirtTier ?? 0,
      accessoryIndex: this.guest?.accessoryIndex ?? 0,
      hairColorIndex: this.guest?.hairColorIndex ?? 0,
      vipTier: this.guest?.vipTier ?? 0,
    });
    this.avatar.position.copy(previousPosition);
    this.avatar.scale.setScalar(1.12);
    this.scene.add(this.avatar);
    if (this.activeEquipment) {
      this.updateWorkoutProps(this.activeEquipment);
      this.avatarTarget = this.stationPosition(this.activeEquipment);
    }
  }

  private resetAvatarPose(): void {
    if (!this.avatar) return;
    this.avatar.position.y = 0;
    this.avatar.rotation.x = 0;
    this.avatar.rotation.z = 0;
    for (const side of ['left', 'right']) {
      const arm = this.avatar.getObjectByName(`dance-arm-${side}`);
      const hand = this.avatar.getObjectByName(`dance-hand-${side}`);
      const leg = this.avatar.getObjectByName(`gym-leg-${side}`);
      if (arm) arm.rotation.set(0, 0, side === 'left' ? 0.08 : -0.08);
      if (hand) hand.rotation.set(0, 0, 0);
      if (leg) leg.rotation.z = 0;
    }
  }

  private readonly draw = (now: number): void => {
    if (!this.renderer || !this.scene || !this.camera) return;
    const delta = Math.min((now - (this.lastFrameTime || now)) / 1000, 0.05);
    this.lastFrameTime = now;
    this.animateAvatar(now / 1000, delta);
    this.renderer.render(this.scene, this.camera);
    if (this.active) this.frameId = requestAnimationFrame(this.draw);
  };

  private animateAvatar(time: number, delta: number): void {
    if (!this.avatar) return;
    const avatar = this.avatar;
    const arms = [avatar.getObjectByName('dance-arm-left'), avatar.getObjectByName('dance-arm-right')];
    const hands = [avatar.getObjectByName('dance-hand-left'), avatar.getObjectByName('dance-hand-right')];
    const legs = [avatar.getObjectByName('gym-leg-left'), avatar.getObjectByName('gym-leg-right')];
    if (this.avatarTarget) {
      const direction = this.avatarTarget.clone().sub(avatar.position);
      const distance = direction.length();
      if (distance < 0.08) {
        avatar.position.copy(this.avatarTarget);
        this.avatarTarget = undefined;
        this.resetAvatarPose();
      } else {
        direction.normalize();
        avatar.position.addScaledVector(direction, Math.min(distance, delta * 2.1));
        avatar.rotation.y = Math.atan2(direction.x, direction.z);
        avatar.position.y = Math.abs(Math.sin(time * 12)) * 0.035;
        if (arms[0]) arms[0].rotation.z = -0.15 + Math.sin(time * 8) * 0.26;
        if (arms[1]) arms[1].rotation.z = 0.15 - Math.sin(time * 8) * 0.26;
        if (legs[0]) legs[0].rotation.z = Math.sin(time * 9) * 0.28;
        if (legs[1]) legs[1].rotation.z = -Math.sin(time * 9) * 0.28;
        return;
      }
    }
    if (!this.activeEquipment) return;
    const exercise = this.activeEquipment.exercise;
    const beat = time * (exercise === 'treadmill' || exercise === 'cycle' ? 7.5 : 3.4);
    if (exercise === 'treadmill') {
      const stride = Math.sin(beat);
      avatar.position.y = Math.abs(stride) * 0.055;
      if (arms[0]) arms[0].rotation.z = -0.28 + stride * 0.2;
      if (arms[1]) arms[1].rotation.z = 0.28 - stride * 0.2;
      if (legs[0]) legs[0].rotation.z = stride * 0.42;
      if (legs[1]) legs[1].rotation.z = -stride * 0.42;
    } else if (exercise === 'cycle') {
      const pedal = Math.sin(beat);
      avatar.position.y = 0.012 + Math.abs(pedal) * 0.012;
      avatar.rotation.x = 0.08 + Math.sin(beat * 0.5) * 0.018;
      if (arms[0]) arms[0].rotation.z = -0.12;
      if (arms[1]) arms[1].rotation.z = 0.12;
      if (legs[0]) legs[0].rotation.z = 0.62 * pedal;
      if (legs[1]) legs[1].rotation.z = -0.62 * pedal;
    } else if (exercise === 'rower') {
      const stroke = Math.sin(beat);
      const pull = Math.max(0, stroke);
      avatar.position.y = Math.max(0, stroke) * 0.025;
      avatar.rotation.x = 0.08 + stroke * 0.14;
      if (arms[0]) arms[0].rotation.z = -0.18 - pull * 0.68;
      if (arms[1]) arms[1].rotation.z = 0.18 + pull * 0.68;
      if (legs[0]) legs[0].rotation.z = -0.34 + pull * 0.34;
      if (legs[1]) legs[1].rotation.z = 0.34 - pull * 0.34;
    } else if (this.activeEquipment.exercise === 'cable') {
      const pull = (Math.sin(beat) + 1) / 2;
      avatar.position.y = Math.max(0, Math.sin(beat + 0.7)) * 0.025;
      if (arms[0]) arms[0].rotation.z = -0.35 - pull * 0.72;
      if (arms[1]) arms[1].rotation.z = 0.35 + pull * 0.72;
      if (hands[0]) hands[0].rotation.z = Math.sin(beat * 2) * 0.18;
      if (hands[1]) hands[1].rotation.z = -Math.sin(beat * 2) * 0.18;
    } else if (exercise === 'legpress') {
      const push = (Math.sin(beat) + 1) / 2;
      avatar.rotation.x = 0.88;
      avatar.position.z = this.stationPosition(this.activeEquipment).z + (push - 0.5) * 0.12;
      if (legs[0]) legs[0].rotation.z = -0.62 + push * 0.58;
      if (legs[1]) legs[1].rotation.z = 0.62 - push * 0.58;
      if (arms[0]) arms[0].rotation.z = -0.72;
      if (arms[1]) arms[1].rotation.z = 0.72;
    } else if (exercise === 'mobility') {
      avatar.rotation.z = Math.sin(beat * 0.5) * 0.12;
      if (arms[0]) arms[0].rotation.z = -0.95 + Math.sin(beat) * 0.18;
      if (arms[1]) arms[1].rotation.z = 0.95 - Math.sin(beat) * 0.18;
    } else {
      const lift = (Math.sin(beat) + 1) / 2;
      const benchPress = this.activeEquipment.name.includes('Ghế tập');
      if (benchPress) avatar.rotation.x = 1.35;
      if (this.activeEquipment.id === 'rack' || this.activeEquipment.id === 'smith') {
        avatar.position.y = -lift * 0.075;
        if (legs[0]) legs[0].rotation.z = -lift * 0.46;
        if (legs[1]) legs[1].rotation.z = lift * 0.46;
        if (arms[0]) arms[0].rotation.z = -1.35;
        if (arms[1]) arms[1].rotation.z = 1.35;
        return;
      }
      if (this.activeEquipment.id === 'kettlebell') {
        avatar.rotation.x = 0.12 + lift * 0.2;
        avatar.position.y = -lift * 0.035;
        if (arms[0]) arms[0].rotation.z = -0.2 - lift * 0.18;
        if (arms[1]) arms[1].rotation.z = 0.2 + lift * 0.18;
        if (legs[0]) legs[0].rotation.z = -lift * 0.3;
        if (legs[1]) legs[1].rotation.z = lift * 0.3;
        return;
      }
      avatar.position.y = lift * 0.045;
      avatar.rotation.z = Math.sin(beat) * 0.035;
      if (arms[0]) arms[0].rotation.z = benchPress ? -0.25 - lift * 0.72 : -0.2 - lift * 1.12;
      if (arms[1]) arms[1].rotation.z = benchPress ? 0.25 + lift * 0.72 : 0.2 + lift * 1.12;
      if (hands[0]) hands[0].rotation.z = Math.sin(beat * 2) * 0.12;
      if (hands[1]) hands[1].rotation.z = -Math.sin(beat * 2) * 0.12;
      if (legs[0]) legs[0].rotation.z = -lift * 0.38;
      if (legs[1]) legs[1].rotation.z = lift * 0.38;
    }
  }

  private buildRoom(): void {
    const scene = this.scene!;
    scene.add(new THREE.HemisphereLight(0xc9d7d0, 0x1b2020, 2.1));
    const key = new THREE.DirectionalLight(0xffefd9, 3.2);
    key.position.set(-4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -13;
    key.shadow.camera.right = 13;
    key.shadow.camera.top = 13;
    key.shadow.camera.bottom = -13;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x91a9ad, 1.7);
    fill.position.set(4, 6, -5);
    scene.add(fill);

    const floor = this.material(0x272c2c, 0.92);
    const ground = this.box(18, 0.22, 16, floor, 0, -0.13, 0);
    ground.receiveShadow = true;
    const tileLine = this.material(0x343a38, 0.9);
    for (let x = -8.5; x <= 8.5; x += 1) {
      this.box(0.018, 0.006, 16, tileLine, x, -0.014, 0);
    }
    for (let z = -7.5; z <= 7.5; z += 1) {
      this.box(18, 0.006, 0.018, tileLine, 0, -0.012, z);
    }

    const backWall = this.box(18, 4.8, 0.16, this.material(0x343b3b, 0.84), 0, 2.28, -7.92);
    backWall.receiveShadow = true;
    this.box(0.16, 4.8, 16, this.material(0x293131, 0.86), -8.92, 2.28, 0);
    this.box(0.16, 4.8, 16, this.material(0x293131, 0.86), 8.92, 2.28, 0);
    // Full-height mirror panels, slim dark mullions and a continuous handrail.
    const mirror = new THREE.MeshStandardMaterial({
      color: 0x829795,
      metalness: 0.82,
      roughness: 0.16,
      emissive: 0x182526,
      emissiveIntensity: 0.22,
    });
    for (const x of [-7.5, -6, -4.5, -3, -1.5, 0, 1.5, 3, 4.5, 6, 7.5]) {
      this.box(1.38, 2.72, 0.035, mirror, x, 2.31, -7.8);
      this.box(0.035, 2.85, 0.055, this.material(0x171d1e, 0.4), x + 0.72, 2.31, -7.76);
    }
    this.box(16.5, 0.07, 0.07, this.material(0x757c78, 0.36), 0, 0.96, -7.68);

    // Timber acoustic slats break up the concrete side walls.
    for (let z = -6.9; z <= 6.9; z += 0.28) {
      this.box(0.025, 2.65, 0.08, this.material(0x5a4636, 0.72), -8.79, 2.35, z);
    }
    // Industrial ceiling beams and warm linear fixtures.
    for (const z of [-6.5, -2.2, 2.2, 6.5]) {
      this.box(17.6, 0.13, 0.18, this.material(0x202829, 0.5), 0, 4.67, z);
      const light = new THREE.MeshStandardMaterial({
        color: 0xffe7b5,
        emissive: 0xffbd6b,
        emissiveIntensity: 1.15,
        roughness: 0.3,
      });
      this.box(14, 0.035, 0.09, light, 0, 4.56, z + 0.12);
    }
    this.box(3.8, 0.62, 0.06, this.material(0x202a26, 0.55), 0, 3.65, -7.78);
    this.box(3.2, 0.04, 0.025, this.material(0xa2c39d, 0.4, 0x486b4e), 0, 3.62, -7.73);
    this.addPlant(-8.05, -6.7);
    this.addPlant(8.05, -6.7);
    this.addWaterStation(7.7, 6.3);
  }

  private placeEquipment(): void {
    // Back wall: selectorized machines, cable station and the free-weight zone.
    this.addCableMachine(-0.35 * ROOM_SPACING, -2.75 * ROOM_SPACING);
    this.addDumbbellRack(2.85 * ROOM_SPACING, -2.8 * ROOM_SPACING);
    this.addPowerRack(-2.95 * ROOM_SPACING, -2.6 * ROOM_SPACING);
    this.addSmithMachine(-1.55 * ROOM_SPACING, -2.55 * ROOM_SPACING);
    // Cardio row along the right side, with screens and separate foot rails.
    this.addTreadmill(3.25 * ROOM_SPACING, 0.05 * ROOM_SPACING, -0.22);
    this.addTreadmill(3.25 * ROOM_SPACING, 1.75 * ROOM_SPACING, -0.22);
    this.addExerciseBike(1.35 * ROOM_SPACING, 2.1 * ROOM_SPACING);
    this.addElliptical(1.35 * ROOM_SPACING, 0.15 * ROOM_SPACING);
    this.addRower(-0.55 * ROOM_SPACING, 2.45 * ROOM_SPACING);
    this.addLegPress(0.25 * ROOM_SPACING, -0.1 * ROOM_SPACING);
    this.addBench(-2.55 * ROOM_SPACING, 0.05 * ROOM_SPACING);
    this.addKettlebells(-3.65 * ROOM_SPACING, 2.6 * ROOM_SPACING);
    this.addYogaMats(-1.2 * ROOM_SPACING, 3.15 * ROOM_SPACING);
    this.addWeightTree(1.35 * ROOM_SPACING, -2.72 * ROOM_SPACING);
    this.addResistanceBands(-0.8 * ROOM_SPACING, 3.0 * ROOM_SPACING);
  }

  private addPowerRack(x: number, z: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x333a3c, 0.38, 0x15191b);
    const accent = this.material(0xb8763f, 0.5);
    for (const px of [-0.72, 0.72]) {
      for (const pz of [-0.58, 0.58]) {
        this.addBox(g, 0.11, 2.6, 0.11, steel, px, 1.3, pz);
        for (let y = 0.38; y < 2.48; y += 0.19) {
          this.addBox(g, 0.12, 0.028, 0.13, accent, px, y, pz + 0.014);
        }
      }
    }
    for (const y of [2.48, 0.18]) {
      this.addBox(g, 1.55, 0.11, 0.11, steel, 0, y, -0.58);
      this.addBox(g, 1.55, 0.11, 0.11, steel, 0, y, 0.58);
      this.addBox(g, 0.11, 0.11, 1.2, steel, -0.72, y, 0);
      this.addBox(g, 0.11, 0.11, 1.2, steel, 0.72, y, 0);
    }
    this.addBarbell(g, 0, 1.72, 0.12, 2.05, true);
    // Adjustable black bench and stitched pad sit inside the rack.
    this.addBox(g, 0.5, 0.16, 1.5, this.material(0x15191a, 0.77), 0, 0.55, 0.42);
    this.addBox(g, 0.44, 0.04, 1.43, this.material(0x343839, 0.8), 0, 0.65, 0.42);
    this.addBox(g, 0.1, 0.45, 0.12, steel, 0, 0.3, 0.35);
    this.addBox(g, 0.1, 0.45, 0.12, steel, 0, 0.3, 0.9);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'rack');
  }

  private addBarbell(parent: THREE.Group, x: number, y: number, z: number, length: number, plates: boolean): void {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 14), this.material(0xa9afb0, 0.3));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(x, y, z);
    bar.castShadow = true;
    parent.add(bar);
    for (const side of [-1, 1]) {
      this.addBox(parent, 0.08, 0.07, 0.07, this.material(0x777c7c, 0.32), x + side * (length * 0.45), y, z);
      if (!plates) continue;
      for (const [offset, radius] of [[0.67, 0.3], [0.92, 0.24]] as const) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.1, 24), this.material(0x171a1b, 0.42));
        plate.rotation.z = Math.PI / 2;
        plate.position.set(x + side * offset, y, z);
        plate.castShadow = true;
        parent.add(plate);
        this.addBox(parent, 0.012, radius * 1.5, 0.025, this.material(0xc68d56, 0.4), x + side * offset, y, z + 0.052);
      }
    }
  }

  private addCableMachine(x: number, z: number): void {
    const g = new THREE.Group();
    const frame = this.material(0x333a3c, 0.38);
    for (const px of [-0.82, 0.82]) {
      this.addBox(g, 0.15, 2.45, 0.18, frame, px, 1.23, 0);
      this.addBox(g, 0.34, 0.12, 0.36, frame, px, 0.12, 0);
      for (let i = 0; i < 9; i++) {
        this.addBox(g, 0.4, 0.075, 0.22, this.material(0x171a1b, 0.6), px, 0.42 + i * 0.11, 0);
      }
      this.addCylinder(g, 0.085, 0.085, 0.16, this.material(0xb77c4b, 0.48), px, 2.47, 0);
      this.addBox(g, 0.05, 0.05, 0.05, frame, px, 1.78, 0.12);
      this.addBox(g, 0.025, 0.7, 0.025, this.material(0x9ca4a2, 0.25), px, 1.42, 0.14);
      this.addCylinder(g, 0.035, 0.035, 0.32, frame, px, 1.08, 0.19);
    }
    this.addBox(g, 1.8, 0.13, 0.18, frame, 0, 2.52, 0);
    this.addBox(g, 0.15, 2.65, 0.16, frame, 0, 1.3, -0.68);
    this.addBox(g, 1.5, 0.08, 0.12, this.material(0x202526, 0.4), 0, 0.22, 0);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'cable');
  }

  private addDumbbellRack(x: number, z: number): void {
    const g = new THREE.Group();
    const frame = this.material(0x444a4a, 0.38);
    for (const y of [0.5, 1.08]) {
      this.addBox(g, 1.6, 0.1, 0.4, frame, 0, y, 0);
      this.addBox(g, 1.6, 0.055, 0.12, this.material(0x202526, 0.42), 0, y + 0.08, 0);
      for (let i = 0; i < 6; i++) {
        const px = -0.65 + i * 0.26;
        const weight = this.material(i % 2 ? 0x292e30 : 0x363b3d, 0.48);
        this.addCylinder(g, 0.12, 0.12, 0.11, weight, px - 0.1, y + 0.17, 0);
        this.addCylinder(g, 0.12, 0.12, 0.11, weight, px + 0.1, y + 0.17, 0);
        this.addCylinder(g, 0.027, 0.027, 0.2, this.material(0xa7adab, 0.24), px, y + 0.17, 0);
      }
    }
    for (const px of [-0.72, 0.72]) this.addBox(g, 0.08, 1.12, 0.08, frame, px, 0.56, 0);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'dumbbells');
  }

  private addTreadmill(x: number, z: number, rotation: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x4b5253, 0.34);
    const rubber = this.material(0x151819, 0.92);
    this.addBox(g, 0.86, 0.12, 2.18, rubber, 0, 0.34, 0);
    this.addBox(g, 0.98, 0.08, 2.28, steel, 0, 0.27, 0);
    for (const px of [-0.39, 0.39]) {
      this.addBox(g, 0.07, 0.16, 2.3, this.material(0x979d99, 0.3), px, 0.38, 0);
      this.addBox(g, 0.07, 1.05, 0.07, steel, px, 0.82, -0.91);
      this.addBox(g, 0.07, 0.07, 0.93, steel, px, 1.33, -0.46);
      this.addBox(g, 0.12, 0.1, 1.02, this.material(0x242a2b, 0.55), px * 0.9, 1.34, -0.45);
    }
    this.addBox(g, 0.68, 0.12, 0.34, steel, 0, 1.54, -0.99);
    this.addBox(g, 0.48, 0.22, 0.1, this.material(0x202b2b, 0.32, 0x315a4e), 0, 1.7, -0.98);
    this.addBox(g, 0.1, 0.018, 0.02, this.material(0x78c6a1, 0.25, 0x50b789), 0, 1.72, -0.92);
    this.addCylinder(g, 0.12, 0.12, 0.88, steel, 0, 0.34, 1.02, Math.PI / 2);
    this.addCylinder(g, 0.12, 0.12, 0.88, steel, 0, 0.34, -1.02, Math.PI / 2);
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    this.registerEquipment(g, 'treadmill');
  }

  private addExerciseBike(x: number, z: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x515858, 0.34);
    this.addCylinder(g, 0.55, 0.55, 0.1, this.material(0x24292a, 0.65), 0, 0.63, 0, Math.PI / 2);
    this.addCylinder(g, 0.43, 0.43, 0.04, this.material(0x606968, 0.42), 0, 0.63, 0.07, Math.PI / 2);
    this.addBox(g, 0.1, 0.56, 0.1, steel, 0, 0.8, 0);
    this.addBox(g, 0.45, 0.11, 0.33, this.material(0x181c1d, 0.75), 0, 1.1, -0.2);
    this.addBox(g, 0.1, 0.58, 0.1, steel, 0, 1.12, -0.45);
    this.addBox(g, 0.58, 0.09, 0.16, steel, 0, 1.43, -0.45);
    this.addBox(g, 0.38, 0.25, 0.1, this.material(0x1d2b2a, 0.32, 0x294b41), 0, 1.61, -0.45);
    this.addBox(g, 1.12, 0.09, 0.16, steel, 0, 0.12, 0);
    this.addBox(g, 0.09, 0.06, 0.62, this.material(0x171b1c, 0.7), 0.3, 0.18, 0.02);
    this.addBox(g, 0.09, 0.06, 0.62, this.material(0x171b1c, 0.7), -0.3, 0.18, 0.02);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'cycle');
  }

  private addElliptical(x: number, z: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x596160, 0.34);
    const dark = this.material(0x202526, 0.74);
    this.addBox(g, 1.05, 0.1, 0.16, steel, 0, 0.13, 0);
    this.addCylinder(g, 0.3, 0.3, 0.12, dark, 0, 0.7, -0.28, Math.PI / 2);
    this.addCylinder(g, 0.24, 0.24, 0.08, this.material(0x777f7c, 0.34), 0, 0.7, -0.2, Math.PI / 2);
    this.addBox(g, 0.09, 0.88, 0.1, steel, 0, 0.98, -0.45);
    this.addBox(g, 0.44, 0.25, 0.1, this.material(0x1e2b29, 0.32, 0x294b41), 0, 1.46, -0.45);
    for (const side of [-1, 1]) {
      const handle = this.addBox(g, 0.07, 1.38, 0.07, steel, side * 0.3, 1.28, 0.05);
      handle.rotation.z = side * -0.22;
      const pedalRail = this.addBox(g, 0.07, 0.08, 1.2, steel, side * 0.23, 0.76, 0.1);
      pedalRail.rotation.x = side * -0.2;
      this.addBox(g, 0.22, 0.08, 0.48, dark, side * 0.23, 0.67, 0.28);
    }
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'cycle');
  }

  private addSmithMachine(x: number, z: number): void {
    const g = new THREE.Group();
    const frame = this.material(0x3c4444, 0.36);
    const guide = this.material(0xaab1af, 0.24);
    for (const px of [-0.58, 0.58]) {
      this.addBox(g, 0.13, 2.65, 0.15, frame, px, 1.32, 0);
      this.addBox(g, 0.06, 2.45, 0.06, guide, px, 1.36, 0.1);
      this.addBox(g, 0.28, 0.11, 0.36, frame, px, 0.11, 0);
      for (let y = 0.48; y < 2.4; y += 0.24) {
        this.addBox(g, 0.16, 0.035, 0.22, this.material(0xb97945, 0.45), px, y, 0.04);
      }
    }
    this.addBox(g, 1.35, 0.13, 0.15, frame, 0, 2.62, 0);
    this.addBox(g, 1.35, 0.13, 0.15, frame, 0, 0.12, 0);
    this.addBarbell(g, 0, 1.58, 0.1, 1.75, true);
    this.addBox(g, 1.1, 0.1, 0.12, frame, 0, 0.12, 0.68);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'smith');
  }

  private addRower(x: number, z: number): void {
    const g = new THREE.Group();
    const metal = this.material(0x5b6261, 0.35);
    this.addBox(g, 0.52, 0.12, 2.15, this.material(0x202526, 0.72), 0, 0.25, 0);
    this.addBox(g, 0.42, 0.22, 0.4, this.material(0x181c1d, 0.82), 0, 0.3, 0.42);
    this.addCylinder(g, 0.38, 0.38, 0.13, metal, 0, 0.37, -0.93, Math.PI / 2);
    this.addCylinder(g, 0.3, 0.3, 0.15, this.material(0x272d2e, 0.6), 0, 0.37, -0.93, Math.PI / 2);
    this.addBox(g, 0.06, 0.05, 1.1, metal, 0, 0.48, -0.45);
    this.addBox(g, 0.06, 0.06, 0.32, this.material(0x171a1b, 0.5), 0, 0.78, -0.93);
    this.addBox(g, 0.6, 0.1, 0.13, metal, 0, 0.1, 0);
    g.position.set(x, 0, z);
    g.rotation.y = -0.12;
    this.registerEquipment(g, 'rower');
  }

  private addLegPress(x: number, z: number): void {
    const g = new THREE.Group();
    const frame = this.material(0x414849, 0.38);
    this.addBox(g, 1.18, 0.14, 0.24, frame, 0, 0.14, 0.05);
    this.addBox(g, 0.14, 1.45, 0.14, frame, -0.55, 0.85, -0.4);
    this.addBox(g, 0.14, 1.45, 0.14, frame, 0.55, 0.85, -0.4);
    this.addBox(g, 1.18, 0.13, 0.16, frame, 0, 1.52, -0.4);
    this.addBox(g, 0.84, 0.13, 0.24, this.material(0x24292a, 0.82), 0, 1.26, -0.1);
    for (const px of [-0.39, 0.39]) {
      const rail = this.addBox(g, 0.08, 1.5, 0.08, this.material(0xa0a7a4, 0.22), px, 0.83, -0.43);
      rail.rotation.x = -0.23;
    }
    this.addBox(g, 0.82, 0.12, 0.15, this.material(0x7b8582, 0.3), 0, 1.05, -0.86);
    this.addBox(g, 0.8, 0.16, 0.14, this.material(0x191d1e, 0.77), 0, 0.45, 0.52);
    this.addBox(g, 0.58, 0.12, 0.55, this.material(0x181c1d, 0.78), 0, 0.67, 0.55);
    for (const px of [-0.73, 0.73]) {
      this.addCylinder(g, 0.22, 0.22, 0.13, this.material(0x1d2122, 0.55), px, 0.55, -0.4, Math.PI / 2);
      this.addCylinder(g, 0.18, 0.18, 0.13, this.material(0x1d2122, 0.55), px, 0.83, -0.4, Math.PI / 2);
    }
    g.position.set(x, 0, z);
    g.rotation.y = 0.18;
    this.registerEquipment(g, 'legpress');
  }

  private addBench(x: number, z: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x484f50, 0.4);
    this.addBox(g, 0.48, 0.16, 1.5, this.material(0x1a1e1f, 0.82), 0, 0.62, 0);
    this.addBox(g, 0.43, 0.055, 1.42, this.material(0x343939, 0.75), 0, 0.71, 0);
    this.addBox(g, 0.11, 0.48, 0.13, steel, 0, 0.31, -0.5);
    this.addBox(g, 0.11, 0.48, 0.13, steel, 0, 0.31, 0.52);
    this.addBox(g, 0.86, 0.08, 0.12, steel, 0, 0.12, -0.5);
    this.addBox(g, 0.86, 0.08, 0.12, steel, 0, 0.12, 0.52);
    this.addBarbell(g, 0, 1.35, -0.6, 2.0, true);
    g.position.set(x, 0, z);
    g.rotation.y = -0.32;
    this.registerEquipment(g, 'bench');
  }

  private addKettlebells(x: number, z: number): void {
    const g = new THREE.Group();
    const colors = [0x526b5b, 0x8a6247, 0x566779, 0x9a554a, 0xc19454];
    colors.forEach((color, index) => {
      const px = (index - 2) * 0.3;
      this.addCylinder(g, 0.13, 0.16, 0.22, this.material(color, 0.5), px, 0.19, 0);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 16, Math.PI), this.material(color, 0.45));
      handle.position.set(px, 0.36, 0);
      handle.rotation.z = Math.PI;
      handle.castShadow = true;
      g.add(handle);
    });
    this.addBox(g, 1.72, 0.12, 0.42, this.material(0x444a49, 0.4), 0, 0.08, 0);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'kettlebell');
  }

  private addYogaMats(x: number, z: number): void {
    const g = new THREE.Group();
    const colors = [0x657d70, 0x82716c, 0x687987];
    colors.forEach((color, index) => {
      const mat = this.addBox(g, 0.72, 0.035, 1.65, this.material(color, 0.92), index * 0.82, 0.015, 0);
      mat.rotation.y = -0.12;
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.72, 16), this.material(color, 0.8));
      roll.rotation.z = Math.PI / 2;
      roll.position.set(index * 0.82, 0.075, 0.78);
      roll.castShadow = true;
      g.add(roll);
    });
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'mats');
  }

  private addResistanceBands(x: number, z: number): void {
    const g = new THREE.Group();
    const colors = [0xb85748, 0x668aa0, 0xd2aa58, 0x84966f];
    colors.forEach((color, index) => {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.14 + index * 0.018, 0.018, 8, 24),
        this.material(color, 0.82),
      );
      band.position.set(index * 0.12, 0.14 + index * 0.025, -0.14);
      band.rotation.x = Math.PI / 2;
      band.castShadow = true;
      g.add(band);
    });
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'bands');
  }

  private addWeightTree(x: number, z: number): void {
    const g = new THREE.Group();
    const steel = this.material(0x454b4b, 0.36);
    this.addCylinder(g, 0.09, 0.09, 1.95, steel, 0, 1.0, 0);
    for (let level = 0; level < 4; level++) {
      const y = 0.35 + level * 0.43;
      for (const side of [-1, 1]) {
        this.addCylinder(g, 0.29 - level * 0.035, 0.29 - level * 0.035, 0.12, this.material(0x24292a, 0.46), side * 0.2, y, 0, Math.PI / 2);
        this.addCylinder(g, 0.29 - level * 0.035, 0.29 - level * 0.035, 0.12, this.material(0x24292a, 0.46), side * 0.42, y, 0, Math.PI / 2);
      }
    }
    this.addCylinder(g, 0.42, 0.42, 0.12, steel, 0, 0.08, 0, Math.PI / 2);
    g.position.set(x, 0, z);
    this.registerEquipment(g, 'plates');
  }

  private addPlant(x: number, z: number): void {
    const pot = this.material(0x4b463c, 0.82);
    this.addCylinder(this.scene!, 0.35, 0.25, 0.45, pot, x, 0.22, z);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.95 + (i % 3) * 0.12, 5), this.material(i % 2 ? 0x4e7357 : 0x658260, 0.92));
      leaf.position.set(x + Math.cos(angle) * 0.25, 0.85, z + Math.sin(angle) * 0.25);
      leaf.rotation.z = Math.cos(angle) * 0.3;
      leaf.rotation.x = Math.sin(angle) * 0.3;
      leaf.castShadow = true;
      this.scene!.add(leaf);
    }
  }

  private addWaterStation(x: number, z: number): void {
    const g = new THREE.Group();
    this.addBox(g, 0.82, 0.9, 0.65, this.material(0x394241, 0.58), 0, 0.45, 0);
    this.addBox(g, 0.7, 0.3, 0.58, this.material(0x272e2e, 0.36), 0, 0.93, 0);
    this.addBox(g, 0.52, 0.025, 0.35, this.material(0x81a99a, 0.28, 0x47695c), 0, 0.78, 0.04);
    for (const bx of [-0.23, 0, 0.23]) {
      this.addCylinder(g, 0.065, 0.07, 0.28, this.material(0x91aeb0, 0.24), bx, 1.12, 0.02);
    }
    g.position.set(x, 0, z);
    this.scene!.add(g);
  }

  private registerEquipment(group: THREE.Group, id: string): void {
    group.userData['gymEquipmentId'] = id;
    this.equipmentTargets.push(group);
    this.scene!.add(group);
  }

  private material(color: number, roughness = 0.6, emissive = 0): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: roughness < 0.5 ? 0.58 : 0.12, emissive });
  }

  private box(
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene!.add(mesh);
    return mesh;
  }

  private addBox(
    parent: THREE.Group,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private addCylinder(
    parent: THREE.Group | THREE.Scene,
    topRadius: number,
    bottomRadius: number,
    length: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rotationZ = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, length, 18), material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotationZ;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}
