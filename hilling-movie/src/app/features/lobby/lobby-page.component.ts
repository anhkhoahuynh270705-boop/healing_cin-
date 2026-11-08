import { Component, HostListener, inject, input, OnDestroy, output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import type { Playback } from '../room/models';
import { LobbySceneComponent } from './lobby-scene.component';

export type LobbyCinemaEnvironment = 'indoor' | 'outdoor';

@Component({
  selector: 'app-lobby-page',
  standalone: true,
  imports: [LobbySceneComponent],
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.scss',
})
export class LobbyPageComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  @ViewChild(LobbySceneComponent) private lobbyScene?: LobbySceneComponent;
  readonly displayName = input('Khách');
  readonly vipLevel = input(0);
  readonly gender = input<'male' | 'female'>('male');
  readonly shirtColorIndex = input(2);
  readonly shirtColor = input('#9FADD9');
  readonly shirtTier = input(0);
  readonly accessoryIndex = input(0);
  readonly hairColorIndex = input(0);
  readonly playback = input<Playback | null>(null);
  readonly personalMediaUrl = input('');
  readonly enterCinema = output<LobbyCinemaEnvironment>();
  readonly loginRequested = output<void>();
  readonly donationRequested = output<void>();
  private movementRepeat?: ReturnType<typeof setInterval>;
  private suppressPointerClick = false;
  private suppressClickTimer?: ReturnType<typeof setTimeout>;
  private lastTelevisionUrl = '';
  private safeTelevisionUrl?: SafeResourceUrl;
  nearbyDoor: LobbyCinemaEnvironment | null = null;
  tvOpen = false;

  moveCharacterBy(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.lobbyScene?.moveBy(direction);
  }

  startMovement(direction: 'up' | 'down' | 'left' | 'right', event: PointerEvent): void {
    event.preventDefault();
    this.stopMovement();
    this.suppressPointerClick = true;
    this.moveCharacterBy(direction);
    this.movementRepeat = setInterval(() => this.moveCharacterBy(direction), 95);
  }

  stopMovement(): void {
    if (this.movementRepeat) clearInterval(this.movementRepeat);
    this.movementRepeat = undefined;
    if (this.suppressClickTimer) clearTimeout(this.suppressClickTimer);
    this.suppressClickTimer = setTimeout(() => (this.suppressPointerClick = false), 450);
  }

  onMovementClick(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.suppressPointerClick) {
      this.suppressPointerClick = false;
      if (this.suppressClickTimer) clearTimeout(this.suppressClickTimer);
      return;
    }
    this.moveCharacterBy(direction);
  }

  onDoorProximityChanged(environment: LobbyCinemaEnvironment | null): void {
    this.nearbyDoor = environment;
  }

  @HostListener('document:keydown', ['$event'])
  onEnterDoorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.tvOpen) {
      this.closeTelevision();
      return;
    }
    if (this.tvOpen) return;
    if (event.key.toLowerCase() !== 'e' || !this.nearbyDoor || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable="true"]'))) {
      return;
    }
    event.preventDefault();
    this.enterSelectedDoor();
  }

  enterSelectedDoor(): void {
    if (!this.nearbyDoor) return;
    const environment = this.nearbyDoor;
    this.nearbyDoor = null;
    this.enterCinema.emit(environment);
  }

  openTelevision(): void {
    this.tvOpen = true;
  }

  closeTelevision(): void {
    this.tvOpen = false;
  }

  televisionEmbedUrl(): SafeResourceUrl {
    const playback = this.playback();
    const videoId = playback?.videoId || 'Llw9Q6akRo4';
    const elapsed = playback?.playing
      ? Math.max(0, (playback.serverNow - playback.updatedAt) / 1000)
      : 0;
    const start = Math.floor(Math.max(0, (playback?.position ?? 0) + elapsed));
    const url = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&start=${start}&rel=0&playsinline=1`;
    if (url !== this.lastTelevisionUrl || !this.safeTelevisionUrl) {
      this.lastTelevisionUrl = url;
      this.safeTelevisionUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return this.safeTelevisionUrl!;
  }

  seekPersonalVideo(event: Event): void {
    const video = event.target;
    const playback = this.playback();
    if (!(video instanceof HTMLVideoElement) || !playback) return;
    const elapsed = playback.playing
      ? Math.max(0, (playback.serverNow - playback.updatedAt) / 1000)
      : 0;
    const target = Math.max(0, playback.position + elapsed);
    video.currentTime = Number.isFinite(video.duration) && video.duration > 0
      ? target % video.duration
      : target;
  }

  ngOnDestroy(): void {
    if (this.movementRepeat) clearInterval(this.movementRepeat);
    if (this.suppressClickTimer) clearTimeout(this.suppressClickTimer);
  }
}
