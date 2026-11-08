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
  @Input() selectedDoor: LobbyCinemaEnvironment | null = null;
  @Output() doorProximityChanged = new EventEmitter<LobbyCinemaEnvironment | null>();

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
    if (changes['selectedDoor']) {
      this.updateDoorHighlight();
      this.setNearbyDoor(null);
    }
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.resizeObserver?.disconnect();
    if (this.scene) this.disposeObject(this.scene);
    this.renderer?.dispose();
  }

  moveBy(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.character) return;
    const step = 0.38;
    this.target.copy(this.character.position);
    if (direction === 'left') this.target.x -= step;
    if (direction === 'right') this.target.x += step;
    if (direction === 'up') this.target.z -= step;
    if (direction === 'down') this.target.z += step;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -7.4, 7.4);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -5.8, 6.4);
    this.character.userData['targetX'] = this.target.x;
    this.character.userData['targetZ'] = this.target.z;
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

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 90);
    this.camera.position.set(0, 7.3, 16.4);
    this.camera.lookAt(0, 1.8, -1.7);
    this.buildFoyer(this.scene);
    this.createCharacter();
    this.updateDoorHighlight();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frameId = requestAnimationFrame(this.animate);
  }

  private buildFoyer(scene: THREE.Scene): void {
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

    const chandelierLight = new THREE.PointLight(0xffd69b, 44, 24, 2);
    chandelierLight.position.set(0, 6.4, 0.2);
    scene.add(chandelierLight);

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
    const backWall = this.box(22, 8, 0.45, 0xd9cbb5, 0, 4, -7.2, wallMaterial);
    scene.add(backWall);
    scene.add(this.box(0.45, 8, 17, 0xd0c0aa, -11, 4, 0, wallMaterial));
    scene.add(this.box(0.45, 8, 17, 0xd0c0aa, 11, 4, 0, wallMaterial));
    this.addWallFinish(scene);
    for (const x of [-9.7, -2.45, 2.45, 9.7]) this.addColumn(scene, x, -6.55, 6.65, 0.28);
    for (const x of [-9.7, 9.7]) {
      for (const z of [-4.1, -0.1, 3.9]) this.addColumn(scene, x, z, 6.55, 0.3);
    }

    this.addDoor(scene, 'outdoor', -4.75, 0x81c5d4);
    this.addDoor(scene, 'indoor', 4.75, 0xdfb36e);
    this.addBench(scene, -8.25);
    this.addBench(scene, 8.25);
    this.addPlant(scene, -8.7, -2.2);
    this.addPlant(scene, 8.7, -2.2);
    this.addSideTables(scene);
    this.addWallSconces(scene);
    this.addPosterFrames(scene);

    const chandelier = new THREE.Group();
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xa88454, metalness: 0.72, roughness: 0.3 }),
    );
    chain.position.y = 6.3;
    chandelier.add(chain);
    const fixture = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.075, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0xe6c58a, emissive: 0x593816, metalness: 0.65 }),
    );
    fixture.position.y = 5.68;
    chandelier.add(fixture);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffdca2 }),
      );
      bulb.position.set(Math.cos(angle) * 0.75, 5.65, Math.sin(angle) * 0.75);
      chandelier.add(bulb);
    }
    scene.add(chandelier);
  }

  private addWallFinish(scene: THREE.Scene): void {
    const brass = 0x98754f;
    const darkWood = 0x59453a;
    scene.add(this.box(21.7, 0.2, 0.12, darkWood, 0, 0.34, -6.91));
    scene.add(this.box(21.7, 0.1, 0.12, brass, 0, 0.48, -6.91));
    scene.add(this.box(21.7, 0.15, 0.16, 0xb59970, 0, 6.78, -6.9));
    scene.add(this.box(21.7, 0.08, 0.13, brass, 0, 6.91, -6.9));
    scene.add(this.box(0.12, 0.22, 16.6, darkWood, -10.72, 0.34, 0));
    scene.add(this.box(0.12, 0.22, 16.6, darkWood, 10.72, 0.34, 0));
    scene.add(this.box(0.12, 0.1, 16.6, brass, -10.72, 0.49, 0));
    scene.add(this.box(0.12, 0.1, 16.6, brass, 10.72, 0.49, 0));

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

    // A shallow coffered frieze gives the tall walls a finished transition into the ceiling.
    for (const x of [-8, -4, 0, 4, 8]) {
      scene.add(this.box(0.12, 0.28, 0.56, 0x886c50, x, 7.15, -6.72));
      scene.add(this.box(0.12, 0.28, 0.56, 0x886c50, x, 7.15, 6.72));
    }
    scene.add(this.box(21.5, 0.34, 0.4, 0x332a29, 0, 7.42, -6.85));
    scene.add(this.box(21.5, 0.12, 0.5, 0xb18e64, 0, 7.22, -6.82));
  }

  private addColumn(
    scene: THREE.Scene,
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

  private addWallSconces(scene: THREE.Scene): void {
    for (const x of [-8.45, -1.55, 1.55, 8.45]) {
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

  private addPosterFrames(scene: THREE.Scene): void {
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

  private addSideTables(scene: THREE.Scene): void {
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

  private addDoor(
    scene: THREE.Scene,
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

  private addBench(scene: THREE.Scene, x: number): void {
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

  private addPlant(scene: THREE.Scene, x: number, z: number): void {
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
    character.userData['targetX'] = character.position.x;
    character.userData['targetZ'] = character.position.z;
    this.character = character;
    this.scene.add(character);
  }

  private updateDoorHighlight(): void {
    for (const [environment, material] of this.doorMeshes) {
      material.emissiveIntensity = this.selectedDoor === environment ? 1.05 : 0.27;
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
        const step = Math.min(distance, 3.8 * delta);
        character.position.x += (dx / distance) * step;
        character.position.z += (dz / distance) * step;
        character.rotation.y = Math.atan2(dx, dz);
        this.walkPhase += delta * 11;
        for (const child of character.children) {
          if (child.name === 'gym-leg-left') child.rotation.x = Math.sin(this.walkPhase) * 0.28;
          if (child.name === 'gym-leg-right') child.rotation.x = -Math.sin(this.walkPhase) * 0.28;
        }
      } else {
        character.position.x = targetX;
        character.position.z = targetZ;
        for (const child of character.children) {
          if (child.name === 'gym-leg-left' || child.name === 'gym-leg-right') {
            child.rotation.x *= 0.78;
          }
        }
      }
      this.checkDoorProximity(character.position.x, character.position.z);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private checkDoorProximity(x: number, z: number): void {
    if (!this.selectedDoor) {
      this.setNearbyDoor(null);
      return;
    }
    const doorX = this.selectedDoor === 'outdoor' ? -4.75 : 4.75;
    const environment = Math.hypot(x - doorX, z + 4.9) <= 1.55 ? this.selectedDoor : null;
    this.setNearbyDoor(environment);
  }

  private setNearbyDoor(environment: LobbyCinemaEnvironment | null): void {
    if (this.nearbyDoor === environment) return;
    this.nearbyDoor = environment;
    this.zone.run(() => this.doorProximityChanged.emit(environment));
  }

  private resize(): void {
    const host = this.host.nativeElement;
    if (!this.renderer || !this.camera || !host.clientWidth || !host.clientHeight) return;
    this.camera.aspect = host.clientWidth / host.clientHeight;
    this.camera.fov = this.camera.aspect < 1.45 ? 56 : 43;
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
