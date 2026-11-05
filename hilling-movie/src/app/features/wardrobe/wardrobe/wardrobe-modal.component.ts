import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { WardrobeApiService } from '../data-access/wardrobe-api.service';
import { WardrobeAccount, WardrobeCatalogItem } from '../models/wardrobe.model';
import {
  AvatarPreviewComponent,
  CharacterGender,
} from '../../character-entry/character-entry-modal.component';
import { WardrobeChatFrameComponent } from '../chat-frame/chat-frame.component';

type WardrobeTab = 'frames' | 'shirts';

@Component({
  selector: 'app-wardrobe-modal',
  standalone: true,
  imports: [CommonModule, WardrobeChatFrameComponent, AvatarPreviewComponent],
  templateUrl: './wardrobe-modal.component.html',
  styleUrl: './wardrobe-modal.component.scss',
})
export class WardrobeModalComponent {
  readonly userId = input('');
  readonly authToken = input('');
  readonly isLoggedIn = input(false);
  readonly displayNameInput = input('Khoa');
  readonly initialFrameTier = input(0);
  readonly initialShirtTier = input(0);
  readonly initialGender = input<CharacterGender>('male');
  readonly initialShirtColor = input('');
  readonly closed = output<void>();
  readonly loginRequested = output<void>();
  readonly purchased = output<number>();
  readonly appearanceChanged = output<{ frame: WardrobeCatalogItem; shirt: WardrobeCatalogItem }>();

  private readonly api = inject(WardrobeApiService);
  readonly activeTab = signal<WardrobeTab>('frames');
  readonly items = signal<WardrobeCatalogItem[]>([]);
  readonly account = signal<WardrobeAccount | null>(null);
  readonly loading = signal(true);
  readonly buyingTier = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly selectedFrameTier = signal(0);
  readonly selectedShirtTier = signal(0);
  readonly equippedFrameTier = signal(0);
  readonly equippedShirtTier = signal(0);
  readonly gender = signal<CharacterGender>('male');
  readonly frame = computed(
    () =>
      this.items().find((item) => item.tier === this.selectedFrameTier()) ??
      this.items()[0] ??
      null,
  );
  readonly shirt = computed(
    () =>
      this.items().find((item) => item.tier === this.selectedShirtTier()) ??
      this.items()[0] ??
      null,
  );
  readonly visibleItems = computed(() => this.items());
  readonly selectedItem = computed(() =>
    this.activeTab() === 'frames' ? this.frame() : this.shirt(),
  );
  readonly displayName = computed(() =>
    (this.account()?.displayName || this.displayNameInput() || 'Bạn').slice(0, 10),
  );
  readonly totalConfirmed = computed(() => this.account()?.totalConfirmed ?? 0);
  readonly usableBalance = computed(() => this.account()?.usableBalance ?? 0);
  readonly nextTier = computed(
    () => this.items().find((item) => item.tier > 0 && item.price > this.totalConfirmed()) ?? null,
  );
  readonly currentTier = computed(
    () =>
      this.items()
        .filter((item) => item.tier > 0 && item.price <= this.totalConfirmed())
        .at(-1) ?? null,
  );
  readonly remaining = computed(() => {
    const next = this.nextTier();
    return next ? Math.max(0, next.price - this.totalConfirmed()) : null;
  });
  readonly progress = computed(() => {
    const next = this.nextTier();
    if (!next) return 100;
    const lower = this.currentTier()?.price ?? 0;
    const span = next.price - lower;
    return span > 0
      ? Math.min(100, Math.max(0, ((this.totalConfirmed() - lower) / span) * 100))
      : 0;
  });
  readonly selectedIsOwned = computed(() => this.selectedItem()?.owned ?? false);
  readonly selectedShortfall = computed(() => {
    const item = this.selectedItem();
    return item ? Math.max(0, item.price - this.usableBalance()) : 0;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.gender.set(this.initialGender());
    try {
      const catalog = await this.api.getCatalog();
      this.items.set(catalog);
      if (this.isLoggedIn() && this.userId() && this.authToken()) {
        this.applyAccount(await this.api.getAccount(this.userId(), this.authToken()));
      }
      this.initializeEquipment();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Không tải được tủ đồ.');
    } finally {
      this.loading.set(false);
    }
  }

  choose(item: WardrobeCatalogItem): void {
    if (this.activeTab() === 'frames') {
      this.selectedFrameTier.set(item.tier);
      if (item.owned) this.equippedFrameTier.set(item.tier);
    } else {
      this.selectedShirtTier.set(item.tier);
      if (item.owned) this.equippedShirtTier.set(item.tier);
    }
    this.errorMessage.set('');
    this.successMessage.set('');
    if (item.owned) this.emitEquippedAppearance();
  }

  isSelected(item: WardrobeCatalogItem): boolean {
    return this.activeTab() === 'frames'
      ? this.selectedFrameTier() === item.tier
      : this.selectedShirtTier() === item.tier;
  }

  isEquipped(item: WardrobeCatalogItem): boolean {
    return this.activeTab() === 'frames'
      ? this.equippedFrameTier() === item.tier
      : this.equippedShirtTier() === item.tier;
  }

  async purchaseSelected(): Promise<void> {
    const item = this.selectedItem();
    if (!item || item.tier === 0 || item.owned || this.buyingTier() !== null) return;
    if (!this.isLoggedIn()) {
      this.loginRequested.emit();
      return;
    }
    if (this.selectedShortfall() > 0) {
      this.errorMessage.set(
        `Bạn cần thêm ${this.api.formatAmount(this.selectedShortfall())} để mua bộ ${item.name}.`,
      );
      return;
    }

    this.buyingTier.set(item.tier);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      this.applyAccount(await this.api.purchase(this.userId(), this.authToken(), item.tier));
      this.selectedFrameTier.set(item.tier);
      this.selectedShirtTier.set(item.tier);
      this.equippedFrameTier.set(item.tier);
      this.equippedShirtTier.set(item.tier);
      this.emitEquippedAppearance();
      this.successMessage.set(`Đã mở bộ ${item.name}: áo và khung chat.`);
      this.purchased.emit(item.tier);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Không mua được bộ vật phẩm.');
    } finally {
      this.buyingTier.set(null);
    }
  }

  formatAmount(amount: number): string {
    return this.api.formatAmount(amount);
  }

  close(): void {
    this.closed.emit();
  }

  private applyAccount(account: WardrobeAccount): void {
    this.account.set(account);
    this.items.set(account.items);
  }

  private initializeEquipment(): void {
    const defaultTier = this.items().find((item) => item.tier === 0 && item.owned)?.tier ?? 0;
    const frameTier =
      this.items().find((item) => item.tier === this.initialFrameTier() && item.owned)?.tier ??
      defaultTier;
    const shirtTier =
      this.items().find((item) => item.tier === this.initialShirtTier() && item.owned)?.tier ??
      defaultTier;
    this.equippedFrameTier.set(frameTier);
    this.equippedShirtTier.set(shirtTier);
    this.selectedFrameTier.set(frameTier);
    this.selectedShirtTier.set(shirtTier);
    this.emitEquippedAppearance();
  }

  private emitEquippedAppearance(): void {
    const frame = this.items().find((item) => item.tier === this.equippedFrameTier() && item.owned);
    const shirt = this.items().find((item) => item.tier === this.equippedShirtTier() && item.owned);
    if (frame && shirt) this.appearanceChanged.emit({ frame, shirt });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
