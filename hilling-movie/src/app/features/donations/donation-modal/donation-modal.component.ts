import {
  AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  DonationAccount,
  DonationTier,
  DonationUiConfig,
  DonationUiStatus,
} from '../models/donation.model';
import { DonationUiService } from '../data-access/donation-ui.service';
import { donationHelper } from '../helper/donation.helper';

@Component({
  selector: 'app-donation-modal',
  standalone: true,
  templateUrl: './donation-modal.component.html',
  styleUrl: './donation-modal.component.scss',
})
export class DonationModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ transform: booleanAttribute }) isLoggedIn = false;
  @Input() userId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() loginRequested = new EventEmitter<void>();
  @Output() wardrobeRequested = new EventEmitter<void>();
  @Output() transactionPending = new EventEmitter<void>();
  @Output() transactionFailed = new EventEmitter<string>();
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;

  private readonly donationApi = inject(DonationUiService);
  readonly config = signal<DonationUiConfig | null>(null);
  readonly account = signal<DonationAccount | null>(null);
  readonly selectedId = signal('vip');
  readonly customAmount = signal(10_000);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly loadError = signal('');
  readonly qrLoading = signal(true);
  readonly qrFailed = signal(false);
  readonly qrRevision = signal(0);
  readonly copied = signal<'account' | 'memo' | null>(null);
  readonly toastMessage = signal('');
  readonly transactionStatus = signal<DonationUiStatus>('idle');
  private pollTimer?: ReturnType<typeof setInterval>;
  private copiedTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private successTimer?: ReturnType<typeof setTimeout>;
  private hadPendingRequest = false;
  donationHelper = donationHelper;

  ngOnInit(): void {
    void this.load();
  }

  ngAfterViewInit(): void {
    this.dialog?.nativeElement.focus();
  }

  get Zalolink(): string {
    const phone = this.donationHelper.zaloPhone.replace(/\D/g, ''); // bỏ ký tự không phải số
    return `https://zalo.me/${phone}`;
  }

  get selectedAmount(): number {
    const config = this.config();
    if (!config) return 0;
    if (this.selectedId() === 'light') return config.lightAmount;
    if (this.selectedId() === 'custom') return this.customAmount();
    return this.selectedTier?.amount ?? config.tiers[0]?.amount ?? 0;
  }

  get selectedWalletCredit(): number {
    return this.selectedAmount * 2;
  }

  get selectedAmountValid(): boolean {
    return this.selectedAmount >= 1 && this.selectedAmount <= 100_000_000;
  }

  get selectedTier(): DonationTier | undefined {
    return this.config()?.tiers.find((tier) => tier.id === this.selectedId());
  }

  get qrUrl(): string {
    const config = this.config();
    if (!config || !this.selectedAmount || (this.isLoggedIn && !this.account())) return '';
    const memo = this.account()?.transferCode ?? 'UNG HO Rạp';
    return `${this.donationApi.buildQrUrl(config, this.selectedAmount, memo)}&uiRetry=${this.qrRevision()}`;
  }

  get progressPercent(): number {
    const account = this.account();
    if (!account?.nextTier) return 100;
    const lowerBound = account.currentTier?.amount ?? 0;
    const span = account.nextTier.amount - lowerBound;
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, ((account.totalConfirmed - lowerBound) / span) * 100));
  }

  formatAmount(amount: number): string {
    return this.donationApi.formatAmount(amount);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const config = await this.donationApi.getConfig();
      this.config.set(config);
      if (this.isLoggedIn && this.userId) {
        const account = await this.donationApi.getAccount(this.userId, this.readUserToken());
        this.applyAccount(account);
      }
      this.qrLoading.set(false);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Không tải được dữ liệu ủng hộ.');
      this.qrFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async submitDonation(): Promise<void> {
    if (this.submitting() || !this.isLoggedIn || !this.userId || this.account()?.pending) return;
    this.submitting.set(true);
    this.loadError.set('');
    try {
      const result = await this.donationApi.submit(
        this.userId,
        this.readUserToken(),
        this.selectedAmount,
      );
      this.applyAccount(result.account);
      this.hadPendingRequest = true;
      this.transactionStatus.set('pending');
      this.showToast('Đã gửi yêu cầu đến admin duyệt.');
      this.transactionPending.emit();
      this.startPolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không gửi được yêu cầu duyệt.';
      this.loadError.set(message);
      this.transactionFailed.emit(message);
    } finally {
      this.submitting.set(false);
    }
  }

  selectTier(id: string): void {
    if (this.account()?.pending) return;
    this.selectedId.set(id);
    this.qrLoading.set(true);
    this.qrFailed.set(false);
  }

  updateCustomAmount(event: Event): void {
    const field = event.target as HTMLInputElement;
    const amount = Math.floor(Number(field.value));
    this.customAmount.set(Number.isFinite(amount) ? Math.max(0, amount) : 0);
    this.qrLoading.set(true);
    this.qrFailed.set(false);
  }

  retryQr(): void {
    this.qrFailed.set(false);
    this.qrLoading.set(true);
    this.qrRevision.update((revision) => revision + 1);
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  async copy(value: string, kind: 'account' | 'memo'): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) {
        this.showToast('Không thể sao chép trên trình duyệt này');
        return;
      }
    }
    this.copied.set(kind);
    this.showToast('Đã sao chép');
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(null), 1500);
  }

  requestLogin(): void {
    this.loginRequested.emit();
  }

  private applyAccount(account: DonationAccount): void {
    this.account.set(account);
    if (account.pending) {
      const pendingTier = this.config()?.tiers.find(
        (tier) => tier.amount === account.pendingAmount,
      );
      this.selectedId.set(
        account.pendingAmount === this.config()?.lightAmount
          ? 'light'
          : (pendingTier?.id ?? this.selectedId()),
      );
      this.hadPendingRequest = true;
      this.transactionStatus.set('pending');
      this.startPolling();
      return;
    }
    this.stopPolling();
    if (this.hadPendingRequest && account.latestStatus === 'APPROVED') {
      this.transactionStatus.set('approved');
      if (this.successTimer) clearTimeout(this.successTimer);
      this.successTimer = setTimeout(() => this.transactionStatus.set('idle'), 4500);
    } else if (this.hadPendingRequest && account.latestStatus === 'REJECTED') {
      this.transactionStatus.set('rejected');
    }
    this.hadPendingRequest = false;
  }

  private startPolling(): void {
    if (this.pollTimer || !this.isLoggedIn || !this.userId) return;
    this.pollTimer = setInterval(() => {
      void this.donationApi
        .getAccount(this.userId, this.readUserToken(), true)
        .then((account) => this.applyAccount(account))
        .catch(() => undefined);
    }, 4000);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  private readUserToken(): string {
    try {
      return localStorage.getItem('healing_token') ?? '';
    } catch {
      return '';
    }
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(''), 1800);
  }



  @HostListener('document:keydown', ['$event'])
  handleKeys(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = this.dialog?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.successTimer) clearTimeout(this.successTimer);
  }
}
