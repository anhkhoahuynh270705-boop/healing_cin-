import { Component, Input } from '@angular/core';
import { WardrobeCatalogItem } from '../models/wardrobe.model';

@Component({
  selector: 'app-wardrobe-chat-frame',
  standalone: true,
  templateUrl: './chat-frame.component.html',
  styleUrl: './chat-frame.component.scss',
})
export class WardrobeChatFrameComponent {
  private static nextInstance = 0;

  @Input({ required: true }) frameItem!: WardrobeCatalogItem;
  @Input() message = '';
  readonly instanceId = `frame-${WardrobeChatFrameComponent.nextInstance++}`;

  wingScaleTransform(tier: number): string {
    const scaleByTier = [0, 0.74, 0.84, 0.94, 1.04, 1.14, 1.24];
    const scale = scaleByTier[Math.max(0, Math.min(6, tier))] ?? 1;
    return `translate(150 40) scale(${scale}) translate(-150 -40)`;
  }
}
