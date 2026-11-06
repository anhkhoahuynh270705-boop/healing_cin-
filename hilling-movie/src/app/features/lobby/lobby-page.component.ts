import { Component, input, OnDestroy, output, ViewChild } from '@angular/core';
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
  @ViewChild(LobbySceneComponent) private lobbyScene?: LobbySceneComponent;
  readonly displayName = input('Khách');
  readonly vipLevel = input(0);
  readonly gender = input<'male' | 'female'>('male');
  readonly shirtColorIndex = input(2);
  readonly shirtColor = input('#9FADD9');
  readonly shirtTier = input(0);
  readonly accessoryIndex = input(0);
  readonly hairColorIndex = input(0);
  readonly selectedDoor = input<LobbyCinemaEnvironment | null>(null);
  readonly enterCinema = output<LobbyCinemaEnvironment>();
  readonly doorSelected = output<LobbyCinemaEnvironment>();
  readonly loginRequested = output<void>();
  readonly donationRequested = output<void>();
  private movementRepeat?: ReturnType<typeof setInterval>;
  private suppressPointerClick = false;
  private suppressClickTimer?: ReturnType<typeof setTimeout>;

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

  ngOnDestroy(): void {
    if (this.movementRepeat) clearInterval(this.movementRepeat);
    if (this.suppressClickTimer) clearTimeout(this.suppressClickTimer);
  }
}
