import { Component, input, output } from '@angular/core';

export type LobbyCinemaEnvironment = 'indoor' | 'outdoor';

@Component({
  selector: 'app-lobby-page',
  standalone: true,
  templateUrl: './lobby-page.component.html',
  styleUrl: './lobby-page.component.scss',
})
export class LobbyPageComponent {
  readonly displayName = input('Khách');
  readonly vipLevel = input(0);
  readonly enterCinema = output<LobbyCinemaEnvironment>();
  readonly loginRequested = output<void>();
  readonly donationRequested = output<void>();
}
