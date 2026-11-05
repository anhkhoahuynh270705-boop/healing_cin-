import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import * as THREE from 'three';
import { createCinemaCharacter } from '../room/character/cinema-character.factory';

export type CharacterGender = 'male' | 'female';

export interface CharacterEntrySelection {
  displayName: string;
  gender: CharacterGender;
  shirtColorIndex: number;
}

export const CHARACTER_SHIRT_COLORS = [
  { label: 'Xanh sage', hex: '#B7CC96' },
  { label: 'Cam đất', hex: '#D9998A' },
  { label: 'Xanh periwinkle', hex: '#9FADD9' },
  { label: 'Tím lilac', hex: '#C9A3D6' },
  { label: 'Vàng mù tạt', hex: '#DDB96E' },
  { label: 'Xanh ngọc', hex: '#8CC9C5' },
];

@Component({
  selector: 'app-exp-card',
  standalone: true,
  template: `
    <section class="exp-card" aria-label="Kinh nghiệm nhân vật">
      <div class="exp-card__top">
        <span class="exp-level">LV{{ level }}</span>
        <strong>{{ experience }} EXP</strong>
      </div>
      <div
        class="exp-track"
        role="progressbar"
        aria-label="Tiến trình lên cấp"
        aria-valuemin="0"
        [attr.aria-valuenow]="levelExperience"
        [attr.aria-valuemax]="nextLevelExp"
      >
        <span class="exp-fill" [style.width.%]="(levelExperience / nextLevelExp) * 100"></span>
      </div>
      <p>
        Còn <strong>{{ nextLevelExp - levelExperience }} EXP</strong> nữa để lên LV{{
          level + 1
        }}
        ({{ levelExperience }}/{{ nextLevelExp }})
      </p>
    </section>
  `,
  styles: [
    `
      .exp-card {
        padding: 18px 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        background: #231e2e;
      }
      .exp-card__top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 13px;
        color: #f5f2fa;
      }
      .exp-card__top strong {
        font-size: 18px;
        font-weight: 800;
      }
      .exp-level {
        padding: 5px 9px;
        border-radius: 999px;
        color: #282231;
        background: #f3eff8;
        font-size: 11px;
        font-weight: 800;
      }
      .exp-track {
        height: 10px;
        overflow: hidden;
        border-radius: 99px;
        background: #342d42;
      }
      .exp-fill {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #8b5cf6, #d4bfff);
        transform-origin: left center;
        animation: exp-fill-in 600ms ease-out both;
      }
      .exp-card p {
        margin: 11px 0 0;
        color: #a59fb5;
        font-size: 12px;
      }
      .exp-card p strong {
        color: #d4bfff;
      }
      @keyframes exp-fill-in {
        from {
          width: 0;
        }
      }
    `,
  ],
})
export class ExpCardComponent {
  @Input() experience = 0;
  readonly nextLevelExp = 300;

  get level(): number {
    return Math.floor(this.experience / this.nextLevelExp) + 1;
  }

  get levelExperience(): number {
    return this.experience % this.nextLevelExp;
  }
}

@Component({
  selector: 'app-avatar-preview',
  standalone: true,
  template: `
    <canvas
      #characterCanvas
      class="avatar-preview__canvas"
      role="img"
      [attr.aria-label]="'Nhân vật ' + displayName + ', ' + (gender === 'female' ? 'nữ' : 'nam')"
    ></canvas>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .avatar-preview__canvas {
        display: block;
        width: 100%;
        height: 100%;
        outline: none;
      }
    `,
  ],
})
export class AvatarPreviewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('characterCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() displayName = 'Khoa';
  @Input() gender: CharacterGender = 'male';
  @Input() shirtColor = CHARACTER_SHIRT_COLORS[2].hex;
  @Input() shirtTier = 0;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private character?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private shadow?: THREE.Mesh;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || !this.canvasRef?.nativeElement) return;
    this.initializeRenderer();
    this.renderCharacter();
    const host = this.canvasRef.nativeElement.parentElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(host);
    }
    this.resize();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.renderCharacter();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.disposeObject(this.character);
    this.disposeObject(this.shadow);
    this.renderer?.dispose();
  }

  private initializeRenderer(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x3e2e54, 3.2));

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    keyLight.position.set(0, 3, 4);
    this.scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xffd5b0, 2.4, 12);
    fillLight.position.set(0, 2, 3.5);
    this.scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x9988ff, 1.4, 10);
    rimLight.position.set(0, 2.5, -2);
    this.scene.add(rimLight);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    this.camera.position.set(0, 0.86, 3.7);
    this.camera.lookAt(0, 0.68, 0);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x080610,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.43, 32), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, -0.205, 0);
    this.scene.add(this.shadow);
  }

  private renderCharacter(): void {
    if (!this.scene || !this.renderer || !this.camera) return;
    if (this.character) {
      this.scene.remove(this.character);
      this.disposeObject(this.character);
    }

    this.character = createCinemaCharacter({
      id: 'character-preview',
      displayName: this.displayName || ' ',
      gender: this.gender,
      shirtColorIndex: CHARACTER_SHIRT_COLORS.findIndex((color) => color.hex === this.shirtColor),
      shirtColor: this.shirtColor,
      shirtTier: this.shirtTier,
      vipTier: 0,
    });
    this.scene.add(this.character);
    this.resize();
  }

  private resize(): void {
    if (!this.renderer || !this.camera || !this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 260 ? 34 : 30;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene!, this.camera);
  }

  private disposeObject(object?: THREE.Object3D): void {
    if (!object) return;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        const texture = (material as THREE.MeshBasicMaterial).map;
        texture?.dispose();
        material.dispose();
      }
    });
  }
}

@Component({
  selector: 'app-gender-toggle',
  standalone: true,
  template: `
    <div class="gender-toggle" role="group" aria-label="Giới tính / ngoại hình">
      <button type="button" [class.selected]="value === 'male'" (click)="genderChange.emit('male')">
        @if (value === 'male') {
          <i class="fa-solid fa-check" aria-hidden="true"></i>
        }
        Nam
      </button>
      <button
        type="button"
        [class.selected]="value === 'female'"
        (click)="genderChange.emit('female')"
      >
        @if (value === 'female') {
          <i class="fa-solid fa-check" aria-hidden="true"></i>
        }
        Nữ
      </button>
    </div>
  `,
  styles: [
    `
      .gender-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 52px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 12px;
        color: #a59fb5;
        background: #231e2e;
        font:
          700 14px Inter,
          sans-serif;
        cursor: pointer;
        transition: 150ms ease;
      }
      button:hover {
        border-color: rgba(183, 148, 246, 0.55);
        color: #d4bfff;
      }
      button.selected {
        border-color: #b794f6;
        color: #d4bfff;
        background: rgba(183, 148, 246, 0.12);
      }
      button i {
        font-size: 12px;
      }
    `,
  ],
})
export class GenderToggleComponent {
  @Input()
  value: CharacterGender = 'male';
  readonly genderChange = output<CharacterGender>();
}

@Component({
  selector: 'app-color-picker',
  standalone: true,
  template: `
    <div class="color-picker" role="group" aria-label="Chọn màu áo">
      @for (color of colors; track color.hex; let i = $index) {
        <button
          type="button"
          [class.selected]="value === i"
          [style.--swatch]="color.hex"
          [attr.aria-label]="color.label"
          [attr.aria-pressed]="value === i"
          [title]="color.label"
          (click)="colorChange.emit(i)"
        >
          @if (value === i) {
            <i class="fa-solid fa-check" aria-hidden="true"></i>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      .color-picker {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        max-width: 340px;
      }
      button {
        display: grid;
        flex: 0 0 38px;
        width: 38px;
        height: 38px;
        place-items: center;
        border: 3px solid transparent;
        border-radius: 50%;
        background: var(--swatch);
        cursor: pointer;
        transition:
          border-color 150ms ease,
          transform 150ms ease;
      }
      button:hover {
        transform: scale(1.08);
      }
      button.selected {
        border-color: #b794f6;
        box-shadow: 0 0 0 1px #1a1623;
      }
      button i {
        color: #282231;
        font-size: 13px;
      }
      @media (max-width: 380px) {
        .color-picker {
          gap: 3px;
        }
        button {
          flex-basis: 34px;
          width: 34px;
          height: 34px;
        }
      }
    `,
  ],
})
export class ColorPickerComponent {
  readonly colors = CHARACTER_SHIRT_COLORS;
  @Input()
  value = 2;
  readonly colorChange = output<number>();
}

@Component({
  selector: 'app-character-entry-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpCardComponent,
    AvatarPreviewComponent,
    GenderToggleComponent,
    ColorPickerComponent,
  ],
  templateUrl: './character-entry-modal.component.html',
  styleUrl: './character-entry-modal.component.scss',
})
export class CharacterEntryModalComponent implements OnInit {
  readonly initialName = input('Khoa');
  readonly initialGender = input<CharacterGender>('male');
  readonly initialColorIndex = input(2);
  readonly initialShirtTier = input(0);
  readonly experience = input(0);
  readonly closed = output<void>();
  readonly confirmed = output<CharacterEntrySelection>();

  readonly nameControl = new FormControl('Khoa', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(10)],
  });
  readonly gender = signal<CharacterGender>('male');
  readonly shirtColorIndex = signal(2);
  readonly shirtColors = CHARACTER_SHIRT_COLORS;
  readonly avatarName = signal('Khoa');

  ngOnInit(): void {
    const name = this.initialName().slice(0, 10) || 'Khoa';
    this.nameControl.setValue(name, { emitEvent: false });
    this.avatarName.set(name);
    this.gender.set(this.initialGender());
    this.shirtColorIndex.set(Math.max(0, Math.min(5, this.initialColorIndex())));
  }

  updateName(): void {
    const name = this.nameControl.value.slice(0, 10);
    if (name !== this.nameControl.value) this.nameControl.setValue(name, { emitEvent: false });
    this.avatarName.set(name || ' ');
  }

  confirm(): void {
    const displayName = this.nameControl.value.trim().slice(0, 10);
    if (!displayName) {
      this.nameControl.markAsTouched();
      return;
    }
    this.confirmed.emit({
      displayName,
      gender: this.gender(),
      shirtColorIndex: this.shirtColorIndex(),
    });
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
