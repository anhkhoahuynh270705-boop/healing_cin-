import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { createCinemaCharacter } from '../room/character/cinema-character.factory';
import type { LobbyCinemaEnvironment } from './lobby-page.component';

const FOYER_SCALE_X = 1.35;
const FOYER_SCALE_Z = 1.25;

type LobbySeatTarget = {
  hitArea: THREE.Mesh;
  position: THREE.Vector3;
  rotation: number;
  surfaceY: number;
};

@Component({
  selector: 'app-lobby-scene',
  standalone: true,
  template: '<div #host class="lobby-scene-host" aria-label="Sảnh chờ 3D"></div>',
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
        overflow: hidden;
      }
      .lobby-scene-host {
        width: 100%;
        height: 100%;
      }
      .lobby-scene-host canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class LobbySceneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) private host!: ElementRef<HTMLDivElement>;
  @Input() displayName = 'Khách';
  @Input() gender: 'male' | 'female' = 'male';
  @Input() shirtColorIndex = 2;
  @Input() shirtColor = '#9FADD9';
  @Input() vipLevel = 0;
  @Input() shirtTier = 0;
  @Input() accessoryIndex = 0;
  @Input() hairColorIndex = 0;
  @Output() doorProximityChanged = new EventEmitter<LobbyCinemaEnvironment | null>();
  @Output() tvRequested = new EventEmitter<void>();

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private character?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private frameId = 0;
  private lastFrameTime = 0;
  private walkPhase = 0;
  private marbleTexture?: THREE.CanvasTexture;
  private readonly target = new THREE.Vector3();
  private readonly doorMeshes = new Map<LobbyCinemaEnvironment, THREE.MeshStandardMaterial>();
  private readonly lobbySeatTargets: LobbySeatTarget[] = [];
  private readonly pointerRaycaster = new THREE.Raycaster();
  private readonly pointerPosition = new THREE.Vector2();
  private tvScreenMesh?: THREE.Mesh;
  private ceilingFanRotor?: THREE.Group;
  private nearbyDoor: LobbyCinemaEnvironment | null = null;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => this.initialize());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.scene) return;
    if (
      changes['displayName'] ||
      changes['gender'] ||
      changes['shirtColorIndex'] ||
      changes['shirtColor'] ||
      changes['vipLevel'] ||
      changes['shirtTier'] ||
      changes['accessoryIndex'] ||
      changes['hairColorIndex']
    ) {
      this.createCharacter();
    }
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.resizeObserver?.disconnect();
    this.renderer?.domElement.removeEventListener('pointerdown', this.onCanvasPointerDown);
    if (this.scene) this.disposeObject(this.scene);
    this.renderer?.dispose();
  }

  moveBy(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.character) return;
    this.standFromLobbySeat();
    const step = 0.38;
    this.target.copy(this.character.position);
    if (direction === 'left') this.target.x -= step;
    if (direction === 'right') this.target.x += step;
    if (direction === 'up') this.target.z -= step;
    if (direction === 'down') this.target.z += step;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -10.8, 10.8);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -8.45, 10.4);
    this.character.userData['targetX'] = this.target.x;
    this.character.userData['targetZ'] = this.target.z;
  }

  private readonly onCanvasPointerDown = (event: PointerEvent): void => {
    if (!this.renderer || !this.camera || event.button !== 0) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.pointerPosition.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.pointerRaycaster.setFromCamera(this.pointerPosition, this.camera);
    const targets: THREE.Object3D[] = this.lobbySeatTargets.map((seat) => seat.hitArea);
    if (this.tvScreenMesh) targets.push(this.tvScreenMesh);
    const hit = this.pointerRaycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    if (hit.object === this.tvScreenMesh) {
      this.zone.run(() => this.tvRequested.emit());
      return;
    }
    const seatIndex = Number(hit.object.userData['lobbySeatIndex']);
    if (Number.isInteger(seatIndex)) this.walkToLobbySeat(seatIndex);
  };

  private walkToLobbySeat(index: number): void {
    const character = this.character;
    const seat = this.lobbySeatTargets[index];
    if (!character || !seat || (character.userData['isSeated'] && character.userData['seatIndex'] === index)) {
      return;
    }
    this.standFromLobbySeat();
    character.userData['seatTargetIndex'] = index;
    character.userData['targetX'] = seat.position.x;
    character.userData['targetZ'] = seat.position.z;
  }

  private standFromLobbySeat(): void {
    const character = this.character;
    if (!character) return;
    character.userData['isSeated'] = false;
    character.userData['seatIndex'] = -1;
    character.userData['seatTargetIndex'] = -1;
    for (const child of character.children) {
      if (child.name === 'gym-leg-left' || child.name === 'gym-leg-right') child.rotation.x = 0;
      if (child.name === 'dance-arm-left' || child.name === 'dance-arm-right') child.rotation.x = 0;
    }
  }

  private initialize(): void {
    const host = this.host.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('pointerdown', this.onCanvasPointerDown);

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.camera.position.set(0, 7.5, 21.5);
    this.camera.lookAt(0, 2.0, -3.1);
    const foyer = new THREE.Group();
    this.buildFoyer(foyer);
    foyer.scale.set(FOYER_SCALE_X, 1, FOYER_SCALE_Z);
    this.scene.add(foyer);
    this.createCharacter();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frameId = requestAnimationFrame(this.animate);
  }

  private buildFoyer(scene: THREE.Group): void {
    scene.add(new THREE.HemisphereLight(0xcdd9ec, 0x282025, 1.35));

    const keyLight = new THREE.DirectionalLight(0xffe4c1, 3.6);
    keyLight.position.set(-5, 11, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -13;
    keyLight.shadow.camera.right = 13;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.camera.updateProjectionMatrix();
    scene.add(keyLight);

    const fanLight = new THREE.PointLight(0xffd69b, 38, 24, 2);
    fanLight.position.set(0, 7.15, 0.2);
    scene.add(fanLight);

    const floorTexture = this.makeFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xe4d8c3,
        map: floorTexture,
        roughness: 0.27,
        metalness: 0.12,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.06, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const rugTexture = this.makeCarpetTexture();
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(4.1, 64),
      new THREE.MeshStandardMaterial({ color: 0x9a8274, map: rugTexture, roughness: 0.96 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, -0.025, 1.05);
    rug.scale.set(1.32, 0.6, 1);
    scene.add(rug);
    const rugTrim = new THREE.Mesh(
      new THREE.RingGeometry(3.9, 4.02, 64),
      new THREE.MeshStandardMaterial({ color: 0xb28a5e, metalness: 0.25, roughness: 0.5 }),
    );
    rugTrim.rotation.x = -Math.PI / 2;
    rugTrim.position.set(0, -0.012, 1.05);
    rugTrim.scale.set(1.32, 0.6, 1);
    scene.add(rugTrim);

    const plasterTexture = this.makePlasterTexture();
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9cbb5,
      map: plasterTexture,
      roughness: 0.88,
    });
    const backWall = this.box(22, 10.6, 0.45, 0xd9cbb5, 0, 5.3, -7.2, wallMaterial);
    scene.add(backWall);
    scene.add(this.box(0.45, 10.6, 17, 0xd0c0aa, -11, 5.3, 0, wallMaterial));
    scene.add(this.box(0.45, 10.6, 17, 0xd0c0aa, 11, 5.3, 0, wallMaterial));
    this.addWallFinish(scene);
    this.addCeiling(scene);
    for (const x of [-9.7, -2.45, 2.45, 9.7]) this.addColumn(scene, x, -6.55, 10.58, 0.28);
    for (const x of [-9.7, 9.7]) {
      for (const z of [-4.1, -0.1, 3.9]) this.addColumn(scene, x, z, 10.58, 0.3);
    }

    this.addDoor(scene, 'outdoor', -4.75, 0x81c5d4);
    this.addDoor(scene, 'indoor', 4.75, 0xdfb36e);
    this.addLobbyTelevision(scene);
    this.addBench(scene, -8.25);
    this.addBench(scene, 8.25);
    this.addPlant(scene, -8.7, -2.2);
    this.addPlant(scene, 8.7, -2.2);
    this.addSideTables(scene);
    this.addLobbySeating(scene);
    this.addWallSconces(scene);
    this.addPosterFrames(scene);
    this.addCeilingFan(scene);
  }

  private addCeilingFan(scene: THREE.Group): void {
    const metal = new THREE.MeshStandardMaterial({ color: 0x9e835c, metalness: 0.72, roughness: 0.3 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x39312c, metalness: 0.68, roughness: 0.3 });
    const fan = new THREE.Group();

    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.16, 32), metal);
    canopy.position.y = 10.58;
    fan.add(canopy);
    const ceilingMount = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 20), darkMetal);
    ceilingMount.position.y = 10.38;
    fan.add(ceilingMount);

    const downrod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.45, 16), metal);
    downrod.position.y = 9.14;
    fan.add(downrod);
    const upperCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 20), darkMetal);
    upperCollar.position.y = 7.94;
    fan.add(upperCollar);

    const rotor = new THREE.Group();
    rotor.position.y = 7.82;
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.38, 32), darkMetal);
    motor.position.y = 0.05;
    rotor.add(motor);
    const motorBand = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), metal);
    motorBand.rotation.x = Math.PI / 2;
    motorBand.position.y = -0.07;
    rotor.add(motorBand);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.24, -0.12);
    bladeShape.lineTo(1.45, -0.2);
    bladeShape.quadraticCurveTo(1.86, -0.18, 1.98, -0.05);
    bladeShape.lineTo(1.8, 0.13);
    bladeShape.lineTo(0.3, 0.16);
    bladeShape.closePath();
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    bladeGeometry.rotateX(-Math.PI / 2);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x604936,
      roughness: 0.42,
      metalness: 0.12,
    });
    for (let bladeIndex = 0; bladeIndex < 5; bladeIndex++) {
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.rotation.y = (bladeIndex / 5) * Math.PI * 2;
      blade.castShadow = true;
      rotor.add(blade);
      const bladeHub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), metal);
      bladeHub.position.set(Math.cos(blade.rotation.y) * 0.38, 0.06, -Math.sin(blade.rotation.y) * 0.38);
      rotor.add(bladeHub);
    }

    const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.31, 0.16, 24), metal);
    lightHousing.position.y = -0.2;
    rotor.add(lightHousing);
    const diffuser = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 20, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffe0ab,
        emissive: 0xffc878,
        emissiveIntensity: 0.48,
        roughness: 0.24,
      }),
    );
    diffuser.scale.y = 0.62;
    diffuser.position.y = -0.36;
    rotor.add(diffuser);
    fan.add(rotor);
    scene.add(fan);
    this.ceilingFanRotor = rotor;
  }

  private addCeiling(scene: THREE.Group): void {
    const ceiling = this.box(
      22,
      0.3,
      17,
      0x362d2b,
      0,
      10.8,
      0,
      new THREE.MeshStandardMaterial({ color: 0x362d2b, roughness: 0.86 }),
    );
    ceiling.receiveShadow = true;
    scene.add(ceiling);

    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x70573f,
      metalness: 0.16,
      roughness: 0.52,
    });
    const brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xb18b59,
      metalness: 0.58,
      roughness: 0.34,
    });
    for (const x of [-10.65, -6, -2, 2, 6, 10.65]) {
      scene.add(this.box(0.18, 0.22, 16.8, 0x70573f, x, 10.5, 0, beamMaterial));
      scene.add(this.box(0.035, 0.035, 16.5, 0xb18b59, x + 0.12, 10.37, 0, brassMaterial));
    }
    for (const z of [-8.15, -5, -2, 1, 4, 7.95]) {
      scene.add(this.box(21.7, 0.22, 0.18, 0x70573f, 0, 10.5, z, beamMaterial));
      scene.add(this.box(21.4, 0.035, 0.035, 0xb18b59, 0, 10.37, z + 0.12, brassMaterial));
    }

    const insetMaterial = new THREE.MeshStandardMaterial({
      color: 0x51433c,
      emissive: 0x24170d,
      emissiveIntensity: 0.3,
      roughness: 0.7,
    });
    for (const x of [-8, -4, 0, 4, 8]) {
      for (const z of [-6.5, -3.25, 0, 3.25, 6.5]) {
        scene.add(this.box(3.48, 0.045, 2.55, 0x51433c, x, 10.585, z, insetMaterial));
      }
    }

    for (const x of [-6, 6]) {
      for (const z of [-4, 4]) {
        const poolLight = new THREE.PointLight(0xffd9a6, 13, 8, 2);
        poolLight.position.set(x, 10.15, z);
        scene.add(poolLight);
      }
    }
  }

  private addLobbyTelevision(scene: THREE.Group): void {
    const centerY = 3.82;
    const housing = new THREE.MeshStandardMaterial({ color: 0x211a19, roughness: 0.42, metalness: 0.22 });
    const bezel = new THREE.MeshStandardMaterial({ color: 0x9d784e, roughness: 0.34, metalness: 0.64 });
    scene.add(this.box(3.78, 2.48, 0.34, 0x211a19, 0, centerY, -6.76, housing));
    scene.add(this.box(3.61, 2.31, 0.1, 0x3c3029, 0, centerY, -6.535, bezel));
    scene.add(this.box(3.46, 2.16, 0.045, 0x11151a, 0, centerY, -6.465));

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.91),
      new THREE.MeshBasicMaterial({ map: this.makeLobbyTelevisionTexture(), toneMapped: false }),
    );
    screen.position.set(0, centerY, -6.435);
    scene.add(screen);
    this.tvScreenMesh = screen;

    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xe5ba78 }),
    );
    led.position.set(1.78, centerY - 1.2, -6.42);
    scene.add(led);

    const tvGlow = new THREE.PointLight(0xe6b77c, 8, 5, 2);
    tvGlow.position.set(0, centerY, -5.82);
    scene.add(tvGlow);
  }

  private addWallFinish(scene: THREE.Group): void {
    const brass = 0x98754f;
    const darkWood = 0x59453a;
    scene.add(this.box(21.7, 0.2, 0.12, darkWood, 0, 0.34, -6.91));
    scene.add(this.box(21.7, 0.1, 0.12, brass, 0, 0.48, -6.91));
    scene.add(this.box(21.7, 0.15, 0.16, 0xb59970, 0, 9.86, -6.9));
    scene.add(this.box(21.7, 0.08, 0.13, brass, 0, 10.0, -6.9));
    scene.add(this.box(0.12, 0.22, 16.6, darkWood, -10.72, 0.34, 0));
    scene.add(this.box(0.12, 0.22, 16.6, darkWood, 10.72, 0.34, 0));
    scene.add(this.box(0.12, 0.1, 16.6, brass, -10.72, 0.49, 0));
    scene.add(this.box(0.12, 0.1, 16.6, brass, 10.72, 0.49, 0));
    for (const side of [-1, 1]) {
      scene.add(this.box(0.16, 0.34, 16.6, 0x59453a, side * 10.72, 9.86, 0));
      scene.add(this.box(0.19, 0.08, 16.6, brass, side * 10.72, 10.08, 0));
    }

    for (const x of [-8.35, -6.55, -1.25, 1.25, 6.55, 8.35]) {
      const panel = new THREE.Group();
      const width = x === -1.25 || x === 1.25 ? 1.45 : 1.25;
      panel.add(this.box(width, 1.52, 0.075, 0x6b5141, x, 1.46, -6.91));
      panel.add(this.box(width - 0.12, 1.38, 0.04, 0x9e8263, x, 1.46, -6.86));
      panel.add(this.box(width - 0.23, 1.17, 0.035, 0x493933, x, 1.46, -6.825));
      panel.add(this.box(width - 0.34, 1.06, 0.025, 0x705848, x, 1.46, -6.8));
      scene.add(panel);
    }

    for (const z of [-5.9, -3.1, -0.3, 2.5, 5.3]) {
      for (const side of [-1, 1]) {
        scene.add(this.box(0.06, 2.55, 0.06, 0x947855, side * 10.7, 1.82, z));
        scene.add(this.box(0.1, 0.06, 0.06, 0x947855, side * 10.7, 3.06, z));
        scene.add(this.box(0.1, 0.06, 0.06, 0x947855, side * 10.7, 0.58, z));
      }
    }

    // A high coffered frieze ties the taller walls into the ceiling cornice.
    for (const x of [-8, -4, 0, 4, 8]) {
      scene.add(this.box(0.12, 0.3, 0.56, 0x886c50, x, 9.55, -6.72));
      scene.add(this.box(0.12, 0.3, 0.56, 0x886c50, x, 9.55, 6.72));
    }
    scene.add(this.box(21.5, 0.34, 0.4, 0x332a29, 0, 10.26, -6.85));
    scene.add(this.box(21.5, 0.12, 0.5, 0xb18e64, 0, 10.04, -6.82));
  }

  private addColumn(
    scene: THREE.Group,
    x: number,
    z: number,
    height: number,
    radius: number,
  ): void {
    const column = new THREE.Group();
    column.position.set(x, 0, z);
    const stone = new THREE.MeshStandardMaterial({
      color: 0xe2d4bf,
      map: (this.marbleTexture ??= this.makeMarbleTexture()),
      roughness: 0.31,
      metalness: 0.04,
    });
    const highlight = new THREE.MeshStandardMaterial({ color: 0xf0e4d1, roughness: 0.34 });
    const trim = new THREE.MeshStandardMaterial({
      color: 0xb28a59,
      metalness: 0.62,
      roughness: 0.3,
    });
    const baseHeight = 0.32;
    const shaftHeight = height - 1.08;
    const shaftY = baseHeight + shaftHeight / 2;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.75, radius * 1.95, baseHeight, 24),
      stone,
    );
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    column.add(base);
    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.56, radius * 1.75, 0.12, 24),
      trim,
    );
    baseRing.position.y = baseHeight + 0.04;
    column.add(baseRing);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.08, shaftHeight, 24),
      stone,
    );
    shaft.position.y = shaftY;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    column.add(shaft);

    // Shallow vertical flutes catch the warm light and make each column read as carved stone.
    for (let groove = 0; groove < 16; groove++) {
      const angle = (groove / 16) * Math.PI * 2;
      const flute = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.12, shaftHeight * 0.9, radius * 0.16),
        groove % 2 ? highlight : stone,
      );
      flute.position.set(Math.cos(angle) * radius * 0.94, shaftY, Math.sin(angle) * radius * 0.94);
      flute.rotation.y = -angle;
      flute.castShadow = true;
      column.add(flute);
    }

    const lowerCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.2, radius * 1.1, 0.16, 24),
      trim,
    );
    lowerCollar.position.y = baseHeight + 0.17;
    column.add(lowerCollar);
    const capitalY = height - 0.42;
    const capital = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.65, radius * 1.12, 0.4, 24),
      stone,
    );
    capital.position.y = capitalY;
    capital.castShadow = true;
    column.add(capital);
    const capitalTop = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.85, radius * 1.65, 0.16, 24),
      trim,
    );
    capitalTop.position.y = height - 0.14;
    column.add(capitalTop);
    const abacus = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 3.9, 0.17, radius * 3.9),
      highlight,
    );
    abacus.position.y = height - 0.01;
    abacus.castShadow = true;
    column.add(abacus);
    scene.add(column);
  }

  private addWallSconces(scene: THREE.Group): void {
    for (const x of [-8.45, -2.8, 2.8, 8.45]) {
      const plate = this.box(0.44, 0.62, 0.12, 0x624b3d, x, 3.55, -6.83);
      scene.add(plate);
      const backplate = this.box(0.32, 0.5, 0.05, 0xc4a273, x, 3.55, -6.74);
      scene.add(backplate);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.055, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0xb8945f, metalness: 0.6, roughness: 0.32 }),
      );
      stem.position.set(x, 3.38, -6.47);
      stem.rotation.x = Math.PI / 2;
      scene.add(stem);
      const shade = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffe2ae,
          emissive: 0xffc876,
          emissiveIntensity: 1.1,
          roughness: 0.25,
        }),
      );
      shade.scale.set(0.78, 1.2, 0.78);
      shade.position.set(x, 3.55, -6.34);
      scene.add(shade);
      const light = new THREE.PointLight(0xf6be78, 12, 6, 2);
      light.position.set(x, 3.35, -5.75);
      scene.add(light);
    }
  }

  private addPosterFrames(scene: THREE.Group): void {
    for (const [x, title, color] of [
      [-7.2, 'CINÉ · NO. 01', '#a87654'],
      [7.2, 'FILM · MUSIC', '#62778a'],
    ] as const) {
      const frame = this.box(1.45, 2.1, 0.16, 0x876747, x, 4.35, -6.84);
      scene.add(frame);
      const inner = this.box(1.28, 1.92, 0.06, 0x211b1b, x, 4.35, -6.73);
      scene.add(inner);
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(1.12, 1.72),
        new THREE.MeshBasicMaterial({ map: this.makePosterTexture(title, color) }),
      );
      art.position.set(x, 4.35, -6.68);
      scene.add(art);
      for (const side of [-1, 1]) {
        const pin = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xe0bd83, metalness: 0.55 }),
        );
        pin.position.set(x + side * 0.57, 5.17, -6.62);
        scene.add(pin);
      }
    }
  }

  private addSideTables(scene: THREE.Group): void {
    for (const x of [-6.65, 6.65]) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.49, 0.49, 0.12, 28),
        new THREE.MeshStandardMaterial({ color: 0xc6ab83, roughness: 0.24, metalness: 0.18 }),
      );
      top.position.set(x, 0.95, 1.48);
      top.castShadow = true;
      scene.add(top);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.16, 0.78, 16),
        new THREE.MeshStandardMaterial({ color: 0x604638, metalness: 0.28, roughness: 0.48 }),
      );
      stem.position.set(x, 0.52, 1.48);
      scene.add(stem);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.43, 0.1, 24),
        new THREE.MeshStandardMaterial({ color: 0x9c7954, metalness: 0.48, roughness: 0.4 }),
      );
      base.position.set(x, 0.09, 1.48);
      scene.add(base);

      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.16, 0.24, 14),
        new THREE.MeshStandardMaterial({ color: 0x6b9a83, roughness: 0.24, metalness: 0.18 }),
      );
      vase.position.set(x, 1.13, 1.48);
      scene.add(vase);
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xe7c89a }),
      );
      flower.position.set(x, 1.31, 1.48);
      scene.add(flower);
    }
  }

  private addLobbySeating(scene: THREE.Group): void {
    const wood = new THREE.MeshStandardMaterial({ color: 0x49362d, roughness: 0.44, metalness: 0.1 });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x70434a, roughness: 0.9 });
    const piping = new THREE.MeshStandardMaterial({ color: 0xc3a06e, metalness: 0.48, roughness: 0.34 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x292326, metalness: 0.62, roughness: 0.36 });
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const seatPositions: Array<[number, number]> = [
      [-5.05, -0.85],
      [5.05, -0.85],
      [-5.05, 2.15],
      [5.05, 2.15],
      [-5.05, 5.05],
      [5.05, 5.05],
    ];

    seatPositions.forEach(([x, z], index) => {
      const chair = new THREE.Group();
      chair.position.set(x, 0, z);
      chair.rotation.y = Math.PI;

      const footBase = this.box(1.14, 0.16, 0.94, 0x3e302b, 0, 0.12, 0.02, wood);
      chair.add(footBase);
      const apron = this.box(1.08, 0.18, 0.83, 0x594138, 0, 0.39, 0.02, wood);
      chair.add(apron);
      const cushion = this.box(1.03, 0.22, 0.84, 0x70434a, 0, 0.61, 0.05, velvet);
      cushion.castShadow = true;
      chair.add(cushion);
      const seatPiping = this.box(1.04, 0.035, 0.84, 0xc3a06e, 0, 0.735, 0.05, piping);
      chair.add(seatPiping);

      const backShell = this.box(1.12, 1.22, 0.2, 0x49362d, 0, 1.18, -0.34, wood);
      chair.add(backShell);
      const backCushion = this.box(0.94, 0.99, 0.12, 0x70434a, 0, 1.21, -0.205, velvet);
      chair.add(backCushion);
      const headPad = this.box(0.72, 0.2, 0.13, 0x85525a, 0, 1.78, -0.19, velvet);
      chair.add(headPad);
      for (const buttonY of [0.94, 1.2, 1.46]) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), piping);
        button.position.set(0, buttonY, -0.128);
        chair.add(button);
      }

      for (const side of [-1, 1]) {
        const armBase = this.box(0.24, 0.42, 0.82, 0x49362d, side * 0.63, 0.7, 0.08, wood);
        chair.add(armBase);
        const armPad = this.box(0.25, 0.11, 0.78, 0x85525a, side * 0.63, 0.96, 0.08, velvet);
        chair.add(armPad);
        const armTrim = this.box(0.26, 0.035, 0.78, 0xc3a06e, side * 0.63, 1.025, 0.08, piping);
        chair.add(armTrim);
        for (const legZ of [-0.31, 0.34]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.43, 12), darkMetal);
          leg.position.set(side * 0.43, 0.23, legZ);
          chair.add(leg);
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.08, 12), piping);
          foot.position.set(side * 0.43, 0.045, legZ);
          chair.add(foot);
        }
      }

      const hitArea = new THREE.Mesh(new THREE.BoxGeometry(1.62, 2.05, 1.5), hitMaterial);
      hitArea.position.set(0, 1.0, 0.02);
      hitArea.userData['lobbySeatIndex'] = index;
      chair.add(hitArea);
      scene.add(chair);
      this.lobbySeatTargets.push({
        hitArea,
        // Chairs face the television at negative Z, so approach from their front edge.
        position: new THREE.Vector3(x * FOYER_SCALE_X, 0, (z - 0.88) * FOYER_SCALE_Z),
        rotation: Math.PI,
        surfaceY: 0.735,
      });
    });
  }

  private addDoor(
    scene: THREE.Group,
    environment: LobbyCinemaEnvironment,
    x: number,
    accent: number,
  ): void {
    const z = -6.5;
    const portal = new THREE.MeshStandardMaterial({
      color: environment === 'outdoor' ? 0x203b50 : 0x4b2b2c,
      emissive: accent,
      emissiveIntensity: 0.27,
      roughness: 0.35,
      metalness: 0.16,
    });
    this.doorMeshes.set(environment, portal);
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 3.35), portal);
    opening.position.set(x, 1.7, z);
    scene.add(opening);

    const wood = new THREE.MeshStandardMaterial({ color: 0x553e32, roughness: 0.48 });
    scene.add(this.box(0.32, 3.5, 0.48, 0x6d523d, x - 1.48, 1.75, z + 0.03));
    scene.add(this.box(0.32, 3.5, 0.48, 0x6d523d, x + 1.48, 1.75, z + 0.03));
    const innerJamb = new THREE.MeshStandardMaterial({
      color: 0xb78b58,
      metalness: 0.56,
      roughness: 0.33,
    });
    scene.add(this.box(0.075, 3.24, 0.1, 0xb78b58, x - 1.29, 1.72, z + 0.22, innerJamb));
    scene.add(this.box(0.075, 3.24, 0.1, 0xb78b58, x + 1.29, 1.72, z + 0.22, innerJamb));
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.17, 12, 42, Math.PI), wood);
    arch.position.set(x, 3.48, z + 0.03);
    scene.add(arch);
    const innerArch = new THREE.Mesh(
      new THREE.TorusGeometry(1.27, 0.045, 8, 42, Math.PI),
      innerJamb,
    );
    innerArch.position.set(x, 3.47, z + 0.21);
    scene.add(innerArch);
    scene.add(this.box(0.2, 0.18, 0.66, 0xd0aa70, x - 1.48, 3.5, z + 0.02));
    scene.add(this.box(0.2, 0.18, 0.66, 0xd0aa70, x + 1.48, 3.5, z + 0.02));

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.54),
      new THREE.MeshBasicMaterial({
        map: this.makeSignTexture(environment === 'outdoor' ? 'RẠP NGOÀI TRỜI' : 'RẠP KÍN'),
        transparent: true,
      }),
    );
    sign.position.set(x, 4.65, z + 0.12);
    scene.add(sign);
    const light = new THREE.PointLight(accent, 18, 7, 2);
    light.position.set(x, 3.1, z + 1.25);
    scene.add(light);

    if (environment === 'outdoor') {
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0xf6e5bb }),
      );
      moon.position.set(x + 0.72, 2.82, z + 0.025);
      scene.add(moon);
      for (const [dx, dy] of [
        [-0.8, 0.45],
        [-0.15, 0.72],
        [0.3, 0.2],
        [0.98, -0.12],
      ]) {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffe5aa }),
        );
        star.position.set(x + dx, 2.7 + dy, z + 0.03);
        scene.add(star);
      }
    } else {
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.34, 0.72),
        new THREE.MeshBasicMaterial({ color: 0xd9b182 }),
      );
      screen.position.set(x, 2.65, z + 0.04);
      scene.add(screen);
      for (const seatX of [-0.58, 0, 0.58]) {
        const seat = this.box(0.38, 0.34, 0.22, 0x9e4f50, x + seatX, 0.65, z + 0.55);
        seat.rotation.y = Math.PI;
        scene.add(seat);
      }
    }

    const threshold = this.box(3.2, 0.06, 1.2, accent, x, 0.025, -4.9);
    scene.add(threshold);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb18c5e,
      metalness: 0.52,
      roughness: 0.32,
    });
    scene.add(this.box(2.85, 0.08, 0.1, 0xb18c5e, x, 0.07, -5.53, mat));
    scene.add(this.box(2.4, 0.045, 1.05, 0x302725, x, 0.04, -5.95));
    const welcomeLight = new THREE.PointLight(accent, 11, 4.5, 2);
    welcomeLight.position.set(x, 2.9, -4.15);
    scene.add(welcomeLight);
  }

  private addBench(scene: THREE.Group, x: number): void {
    const wood = new THREE.MeshStandardMaterial({
      color: 0x5a4035,
      roughness: 0.4,
      metalness: 0.08,
    });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x704a46, roughness: 0.94 });
    const piping = new THREE.MeshStandardMaterial({
      color: 0xb79669,
      metalness: 0.48,
      roughness: 0.42,
    });
    const bench = new THREE.Group();
    bench.position.set(x, 0, 1.5);

    bench.add(this.box(1.82, 0.32, 0.56, 0x594237, 0, 0.62, 0, wood));
    bench.add(this.box(1.73, 0.2, 0.64, 0x71504a, 0, 0.84, -0.03, velvet));
    bench.add(this.box(1.82, 0.92, 0.2, 0x594237, 0, 1.2, -0.25, wood));
    bench.add(this.box(1.67, 0.74, 0.12, 0x79504a, 0, 1.24, -0.11, velvet));
    for (const side of [-1, 1]) {
      bench.add(this.box(0.24, 0.35, 0.68, 0x63483b, side * 0.9, 0.92, 0.02, wood));
      bench.add(this.box(0.28, 0.1, 0.72, 0x8a6549, side * 0.9, 1.14, 0.02, piping));
      for (const z of [-0.22, 0.18]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.54, 12), wood);
        leg.position.set(side * 0.72, 0.29, z);
        bench.add(leg);
      }
      for (const y of [0.98, 1.4]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), piping);
        stud.position.set(side * 0.78, y, -0.035);
        bench.add(stud);
      }
    }
    bench.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    scene.add(bench);
  }

  private addPlant(scene: THREE.Group, x: number, z: number): void {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.54, 0.78, 16),
      new THREE.MeshStandardMaterial({ color: 0x6d473b, roughness: 0.85 }),
    );
    pot.position.set(x, 0.36, z);
    scene.add(pot);
    for (let index = 0; index < 7; index++) {
      const angle = (index / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 1.1 + (index % 3) * 0.18, 7),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0x426149 : 0x587451, roughness: 0.8 }),
      );
      leaf.position.set(x + Math.cos(angle) * 0.28, 1.28, z + Math.sin(angle) * 0.28);
      leaf.rotation.z = Math.cos(angle) * 0.24;
      leaf.rotation.x = Math.sin(angle) * 0.24;
      scene.add(leaf);
    }
  }

  private createCharacter(): void {
    if (!this.scene) return;
    const position = this.character?.position.clone() ?? new THREE.Vector3(0, 0, 3.25);
    if (this.character) {
      this.scene.remove(this.character);
      this.disposeObject(this.character);
    }
    const character = createCinemaCharacter({
      id: 'lobby-character',
      displayName: this.displayName,
      gender: this.gender,
      shirtColorIndex: this.shirtColorIndex,
      shirtColor: this.shirtColor,
      shirtTier: this.shirtTier,
      accessoryIndex: this.accessoryIndex,
      hairColorIndex: this.hairColorIndex,
      vipTier: this.vipLevel,
    });
    character.scale.setScalar(1.3);
    character.rotation.y = 0;
    character.position.copy(position);
    character.position.y = 0;
    character.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(character);
    if (Number.isFinite(bounds.min.y)) character.position.y = -0.025 - bounds.min.y;
    character.userData['groundY'] = character.position.y;
    character.userData['targetX'] = character.position.x;
    character.userData['targetZ'] = character.position.z;
    character.userData['seatTargetIndex'] = -1;
    character.userData['seatIndex'] = -1;
    character.userData['isSeated'] = false;
    this.character = character;
    this.scene.add(character);
  }

  private updateDoorHighlight(): void {
    for (const [environment, material] of this.doorMeshes) {
      material.emissiveIntensity = this.nearbyDoor === environment ? 1.05 : 0.27;
    }
  }

  private readonly animate = (): void => {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.frameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = this.lastFrameTime ? Math.min(0.08, (now - this.lastFrameTime) / 1000) : 0.016;
    this.lastFrameTime = now;

    const character = this.character;
    if (character) {
      const targetX = Number(character.userData['targetX']);
      const targetZ = Number(character.userData['targetZ']);
      const dx = targetX - character.position.x;
      const dz = targetZ - character.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.035) {
        const step = Math.min(distance, 2.8 * delta);
        character.position.x += (dx / distance) * step;
        character.position.z += (dz / distance) * step;
        character.rotation.y = Math.atan2(dx, dz);
        this.walkPhase += delta * 9.2;
        const stride = Math.sin(this.walkPhase) * 0.56;
        for (const child of character.children) {
          if (child.name === 'gym-leg-left') child.rotation.x = stride;
          if (child.name === 'gym-leg-right') child.rotation.x = -stride;
          if (child.name === 'dance-arm-left') child.rotation.x = -stride * 0.3;
          if (child.name === 'dance-arm-right') child.rotation.x = stride * 0.3;
        }
        const walkingHeight = Number(character.userData['groundY']) + (0.5 - Math.cos(this.walkPhase * 2) * 0.5) * 0.035;
        character.position.y = THREE.MathUtils.damp(character.position.y, walkingHeight, 9, delta);
      } else if (!character.userData['isSeated']) {
        character.position.x = targetX;
        character.position.z = targetZ;
        const seatIndex = Number(character.userData['seatTargetIndex']);
        const seat = Number.isInteger(seatIndex) && seatIndex >= 0
          ? this.lobbySeatTargets[seatIndex]
          : undefined;
        if (seat) {
          character.position.y = seat.surfaceY - 0.13;
          character.rotation.y = seat.rotation;
          character.userData['isSeated'] = true;
          character.userData['seatIndex'] = seatIndex;
          character.userData['seatTargetIndex'] = -1;
          for (const child of character.children) {
            if (child.name === 'gym-leg-left' || child.name === 'gym-leg-right') child.rotation.x = -0.88;
            if (child.name === 'dance-arm-left' || child.name === 'dance-arm-right') child.rotation.x = 0.2;
          }
        } else {
          character.position.y = Number(character.userData['groundY']);
          for (const child of character.children) {
            if (child.name === 'gym-leg-left' || child.name === 'gym-leg-right') child.rotation.x *= 0.78;
            if (child.name === 'dance-arm-left' || child.name === 'dance-arm-right') child.rotation.x *= 0.78;
          }
        }
      }
      this.checkDoorProximity(character.position.x, character.position.z);
    }
    if (this.ceilingFanRotor) this.ceilingFanRotor.rotation.y += delta * 0.7;
    this.renderer.render(this.scene, this.camera);
  };

  private checkDoorProximity(x: number, z: number): void {
    const doors: readonly [LobbyCinemaEnvironment, number][] = [
      ['outdoor', -4.75],
      ['indoor', 4.75],
    ];
    const closest = doors
      .map(([environment, doorX]) => ({
        environment,
        distance: Math.hypot(x - doorX * FOYER_SCALE_X, z + 6.5 * FOYER_SCALE_Z),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    const environment = closest.distance <= 2.05 ? closest.environment : null;
    this.setNearbyDoor(environment);
  }

  private setNearbyDoor(environment: LobbyCinemaEnvironment | null): void {
    if (this.nearbyDoor === environment) return;
    this.nearbyDoor = environment;
    this.updateDoorHighlight();
    this.zone.run(() => this.doorProximityChanged.emit(environment));
  }

  private resize(): void {
    const host = this.host.nativeElement;
    if (!this.renderer || !this.camera || !host.clientWidth || !host.clientHeight) return;
    this.camera.aspect = host.clientWidth / host.clientHeight;
    this.camera.fov = this.camera.aspect < 1.45 ? 56 : 48;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
  }

  private box(
    width: number,
    height: number,
    depth: number,
    color: number,
    x: number,
    y: number,
    z: number,
    material?: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material ?? new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private makeFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d')!;
    const tile = 64;
    context.fillStyle = '#6d6258';
    context.fillRect(0, 0, canvas.width, canvas.height);
    let seed = 21;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let row = 0; row < 16; row++) {
      for (let column = 0; column < 16; column++) {
        const x = column * tile;
        const y = row * tile;
        const lightness = Math.round(105 + random() * 32);
        context.fillStyle = `rgb(${lightness + 19}, ${lightness + 12}, ${lightness + 2})`;
        context.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        const gradient = context.createLinearGradient(x, y, x + tile, y + tile);
        gradient.addColorStop(0, 'rgba(255,245,223,0.11)');
        gradient.addColorStop(0.45, 'rgba(255,245,223,0.015)');
        gradient.addColorStop(1, 'rgba(32,25,22,0.11)');
        context.fillStyle = gradient;
        context.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        context.strokeStyle = 'rgba(45,37,32,0.55)';
        context.lineWidth = 2;
        context.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
        for (let vein = 0; vein < 3; vein++) {
          context.beginPath();
          context.strokeStyle = `rgba(247,232,205,${0.05 + random() * 0.1})`;
          context.lineWidth = 0.5 + random();
          const startX = x + random() * tile;
          const startY = y + random() * tile;
          context.moveTo(startX, startY);
          context.bezierCurveTo(
            startX + random() * 20 - 10,
            startY + random() * 20,
            startX + random() * 28 - 14,
            startY + random() * 36,
            startX + random() * 32 - 16,
            startY + random() * 50 - 25,
          );
          context.stroke();
        }
      }
    }
    return this.canvasTexture(canvas);
  }

  private makeCarpetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#684d46';
    context.fillRect(0, 0, 512, 512);
    let seed = 77;
    for (let fiber = 0; fiber < 9000; fiber++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const x = seed % 512;
      seed = (seed * 1103515245 + 12345) >>> 0;
      const y = seed % 512;
      context.strokeStyle = seed % 2 ? 'rgba(226,193,154,0.09)' : 'rgba(27,18,19,0.12)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 2, y + 4);
      context.stroke();
    }
    context.strokeStyle = 'rgba(220,190,150,0.48)';
    context.lineWidth = 11;
    context.strokeRect(23, 23, 466, 466);
    context.strokeStyle = 'rgba(42,25,29,0.55)';
    context.lineWidth = 4;
    context.strokeRect(39, 39, 434, 434);
    return this.canvasTexture(canvas);
  }

  private makePlasterTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(512, 512);
    let seed = 921;
    for (let index = 0; index < image.data.length; index += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed >>> 24) - 128;
      image.data[index] = 207 + noise * 0.09;
      image.data[index + 1] = 193 + noise * 0.09;
      image.data[index + 2] = 170 + noise * 0.09;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    for (let mark = 0; mark < 460; mark++) {
      const x = (mark * 127) % 512;
      const y = (mark * 293) % 512;
      context.fillStyle = mark % 2 ? 'rgba(255,245,223,0.08)' : 'rgba(83,65,49,0.035)';
      context.fillRect(x, y, 1 + (mark % 4), 1 + (mark % 3));
    }
    return this.canvasTexture(canvas);
  }

  private makeMarbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#ddd0bc');
    gradient.addColorStop(0.48, '#f0e5d3');
    gradient.addColorStop(1, '#c8b79d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    for (let vein = 0; vein < 24; vein++) {
      const y = (vein * 47) % 512;
      context.beginPath();
      context.moveTo(-30, y);
      context.bezierCurveTo(110, y - 64 + vein, 280, y + 56, 540, y - 22);
      context.strokeStyle = vein % 3 ? 'rgba(128,105,79,0.13)' : 'rgba(255,250,235,0.32)';
      context.lineWidth = vein % 4 === 0 ? 3 : 1.2;
      context.stroke();
    }
    return this.canvasTexture(canvas);
  }

  private makePosterTexture(title: string, accent: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 480;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 320, 480);
    gradient.addColorStop(0, '#182330');
    gradient.addColorStop(0.58, accent);
    gradient.addColorStop(1, '#211819');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 320, 480);
    context.fillStyle = 'rgba(241,216,174,0.76)';
    context.beginPath();
    context.arc(160, 174, 73, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(31,26,28,0.78)';
    context.beginPath();
    context.moveTo(0, 330);
    context.quadraticCurveTo(155, 245, 320, 340);
    context.lineTo(320, 480);
    context.lineTo(0, 480);
    context.fill();
    context.fillStyle = '#f5e7d1';
    context.textAlign = 'center';
    context.font = '700 27px sans-serif';
    context.fillText(title, 160, 404);
    context.font = '14px sans-serif';
    context.fillText('A PLACE FOR YOUR NEXT STORY', 160, 438);
    return this.canvasTexture(canvas);
  }

  private makeLobbyTelevisionTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 576;
    const context = canvas.getContext('2d')!;

    const sky = context.createLinearGradient(0, 0, 0, 576);
    sky.addColorStop(0, '#18243a');
    sky.addColorStop(0.52, '#75677a');
    sky.addColorStop(0.75, '#e6ae79');
    sky.addColorStop(1, '#273d42');
    context.fillStyle = sky;
    context.fillRect(0, 0, 1024, 576);

    const glow = context.createRadialGradient(700, 250, 8, 700, 250, 250);
    glow.addColorStop(0, 'rgba(255,226,181,0.9)');
    glow.addColorStop(0.16, 'rgba(255,202,151,0.34)');
    glow.addColorStop(1, 'rgba(255,196,147,0)');
    context.fillStyle = glow;
    context.fillRect(430, 0, 594, 520);

    for (let index = 0; index < 54; index++) {
      const x = (index * 193) % 1024;
      const y = (index * 71) % 245;
      context.fillStyle = `rgba(255,239,216,${0.24 + (index % 5) * 0.1})`;
      context.beginPath();
      context.arc(x, y, index % 7 === 0 ? 2.2 : 1.1, 0, Math.PI * 2);
      context.fill();
    }

    const drawRidge = (baseY: number, color: string, amplitude: number, phase: number) => {
      context.beginPath();
      context.moveTo(0, 390);
      for (let x = 0; x <= 1024; x += 16) {
        const y = baseY + Math.sin(x * 0.009 + phase) * amplitude + Math.sin(x * 0.021 + phase) * amplitude * 0.3;
        context.lineTo(x, y);
      }
      context.lineTo(1024, 576);
      context.lineTo(0, 576);
      context.closePath();
      context.fillStyle = color;
      context.fill();
    };
    drawRidge(354, '#4c5358', 34, 0.8);
    drawRidge(405, '#293d40', 38, 2.1);
    drawRidge(458, '#172b30', 24, 4.2);

    const water = context.createLinearGradient(0, 412, 0, 576);
    water.addColorStop(0, 'rgba(229,171,126,0.66)');
    water.addColorStop(0.24, 'rgba(110,112,116,0.76)');
    water.addColorStop(1, 'rgba(17,35,40,0.98)');
    context.fillStyle = water;
    context.fillRect(0, 424, 1024, 152);
    for (let line = 0; line < 34; line++) {
      const y = 438 + line * 4;
      const width = 18 + ((line * 47) % 168);
      const x = (line * 83) % 1024;
      context.fillStyle = `rgba(255,218,176,${0.05 + (line % 4) * 0.025})`;
      context.fillRect(x, y, width, 1 + (line % 2));
    }

    const titleShade = context.createLinearGradient(0, 320, 0, 576);
    titleShade.addColorStop(0, 'rgba(9,15,23,0)');
    titleShade.addColorStop(1, 'rgba(8,13,19,0.78)');
    context.fillStyle = titleShade;
    context.fillRect(0, 310, 1024, 266);
    context.textAlign = 'center';
    context.fillStyle = '#fff1d9';
    context.shadowColor = 'rgba(16, 12, 16, 0.5)';
    context.shadowBlur = 14;
    context.font = '600 46px Georgia, serif';
    context.fillText('HEALING CINÉ', 512, 498);
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255,236,211,0.86)';
    context.font = '500 15px sans-serif';
    context.fillText('KHÔNG GIAN XEM PHIM RIÊNG TƯ', 512, 528);
    return this.canvasTexture(canvas);
  }

  private canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer?.capabilities.getMaxAnisotropy() ?? 1, 8);
    return texture;
  }

  private makeSignTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 140;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(24, 19, 20, 0.92)';
    context.beginPath();
    context.roundRect(4, 4, 632, 132, 26);
    context.fill();
    context.strokeStyle = 'rgba(231, 196, 139, 0.85)';
    context.lineWidth = 5;
    context.stroke();
    context.fillStyle = '#f4dfba';
    context.font = '700 39px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 320, 72);
    return this.canvasTexture(canvas);
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }
}
