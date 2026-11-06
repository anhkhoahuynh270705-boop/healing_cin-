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
      :host { position: absolute; inset: 0; display: block; overflow: hidden; }
      .lobby-scene-host { width: 100%; height: 100%; }
      .lobby-scene-host canvas { display: block; width: 100%; height: 100%; }
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
  @Output() doorReached = new EventEmitter<LobbyCinemaEnvironment>();

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private character?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private frameId = 0;
  private lastFrameTime = 0;
  private walkPhase = 0;
  private readonly target = new THREE.Vector3();
  private readonly doorMeshes = new Map<LobbyCinemaEnvironment, THREE.MeshStandardMaterial>();

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
    if (changes['selectedDoor']) this.updateDoorHighlight();
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
    scene.add(new THREE.HemisphereLight(0xcdd9ec, 0x282025, 2.0));

    const chandelierLight = new THREE.PointLight(0xffd69b, 75, 22, 2);
    chandelierLight.position.set(0, 6.4, 0.2);
    scene.add(chandelierLight);
    for (const x of [-5, 5]) {
      const sconce = new THREE.PointLight(0xf2b974, 34, 10, 2);
      sconce.position.set(x, 3.2, -4.6);
      scene.add(sconce);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x302b2c, roughness: 0.28, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.06, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(4.1, 64),
      new THREE.MeshStandardMaterial({ color: 0x503c38, roughness: 0.92 }),
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

    const backWall = this.box(22, 8, 0.45, 0x211c20, 0, 4, -7.2);
    scene.add(backWall);
    scene.add(this.box(0.45, 8, 17, 0x282226, -11, 4, 0));
    scene.add(this.box(0.45, 8, 17, 0x282226, 11, 4, 0));
    scene.add(this.box(22, 0.3, 0.45, 0x493a35, 0, 7.2, -6.85));
    for (const x of [-9, -7, -2.8, 2.8, 7, 9]) {
      const pillar = this.box(0.34, 6.2, 0.48, 0x514238, x, 3.1, -6.55);
      scene.add(pillar);
      scene.add(this.box(0.56, 0.24, 0.7, 0x9a7650, x, 6.28, -6.55));
      scene.add(this.box(0.56, 0.24, 0.7, 0x9a7650, x, 0.2, -6.55));
    }

    this.addDoor(scene, 'outdoor', -4.75, 0x81c5d4);
    this.addDoor(scene, 'indoor', 4.75, 0xdfb36e);
    this.addBench(scene, -8.7);
    this.addBench(scene, 8.7);
    this.addPlant(scene, -9.4, -2.3);
    this.addPlant(scene, 9.4, -2.3);

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
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.17, 12, 42, Math.PI),
      wood,
    );
    arch.position.set(x, 3.48, z + 0.03);
    scene.add(arch);
    scene.add(this.box(0.2, 0.18, 0.66, 0xd0aa70, x - 1.48, 3.5, z + 0.02));
    scene.add(this.box(0.2, 0.18, 0.66, 0xd0aa70, x + 1.48, 3.5, z + 0.02));

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.54),
      new THREE.MeshBasicMaterial({ map: this.makeSignTexture(environment === 'outdoor' ? 'RẠP NGOÀI TRỜI' : 'RẠP KÍN'), transparent: true }),
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
      for (const [dx, dy] of [[-0.8, 0.45], [-0.15, 0.72], [0.3, 0.2], [0.98, -0.12]]) {
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
  }

  private addBench(scene: THREE.Scene, x: number): void {
    const seat = this.box(1.9, 0.24, 0.62, 0x60443c, x, 0.82, 1.5);
    const back = this.box(1.9, 0.78, 0.22, 0x704b42, x, 1.25, 1.78);
    const legs = this.box(1.48, 0.72, 0.18, 0x6d543e, x, 0.38, 1.53);
    scene.add(seat, back, legs);
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
        this.checkDoorArrival(character.position.x, character.position.z);
      }
    }
    this.renderer.render(this.scene, this.camera);
  };

  private checkDoorArrival(x: number, z: number): void {
    if (!this.selectedDoor) return;
    const doorX = this.selectedDoor === 'outdoor' ? -4.75 : 4.75;
    if (Math.hypot(x - doorX, z + 4.9) > 1.25) return;
    const environment = this.selectedDoor;
    this.selectedDoor = null;
    this.zone.run(() => this.doorReached.emit(environment));
  }

  private resize(): void {
    const host = this.host.nativeElement;
    if (!this.renderer || !this.camera || !host.clientWidth || !host.clientHeight) return;
    this.camera.aspect = host.clientWidth / host.clientHeight;
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
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
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
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
