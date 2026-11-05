import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminRealtimeService } from '../data-access/admin-realtime.service';
import { PaymentApiService } from '../../payment/data-access/payment-api.service';
import { PaymentRequestView } from '../../payment/models/vip-tier.model';

@Component({
  selector: 'app-payment-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-review.component.html',
  styleUrl: './payment-review.component.scss',
})
export class PaymentReviewComponent implements OnInit, OnDestroy {
  @Input() requestType: 'VIP' | 'PRIVATE_ROOM' | 'DONATION' = 'VIP';
  @Output() authenticatedChange = new EventEmitter<boolean>();
  @Output() requestsChange = new EventEmitter<PaymentRequestView[]>();

  adminToken = '';
  loading = false;
  readonly busyRequestIds = new Set<string>();
  requests: PaymentRequestView[] = [];
  error = '';
  notice = '';

  get visibleRequests(): PaymentRequestView[] {
    return this.requests.filter((request) => {
      const type = request.type || 'VIP';
      return type === this.requestType;
    });
  }

  private realtimeSubscriptions = new Subscription();
  private incomingDuringLoad: PaymentRequestView[] = [];
  private readonly locallyDecidedIds = new Set<string>();

  constructor(
    private readonly paymentApi: PaymentApiService,
    readonly realtime: AdminRealtimeService,
  ) {}

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    this.adminToken = this.readSavedToken();
    if (!this.adminToken) {
      this.authenticatedChange.emit(false);
      return;
    }

    this.realtimeSubscriptions.add(
      this.realtime.paymentRequest$.subscribe((request) => this.addIncomingRequest(request)),
    );
    this.requests = this.readCachedRequests();
    this.requestsChange.emit(this.requests);
    void this.load();
    this.realtime.connect(this.adminToken);
  }

  ngOnDestroy(): void {
    this.realtimeSubscriptions.unsubscribe();
    this.realtime.disconnect();
  }

  async load(): Promise<void> {
    if (!this.adminToken) return;
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.incomingDuringLoad = [];
    this.error = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.paymentApi.getPending(this.adminToken, controller.signal);
      if (response.status === 401 || response.status === 403) {
        this.logout();
        return;
      }
      if (!response.ok) throw new Error('Máy chủ chưa tải được yêu cầu. Hãy thử lại.');
      const incoming = (await response.json()) as PaymentRequestView[];
      this.requests = this.mergePending(incoming, this.incomingDuringLoad).filter(
        (request) => !this.locallyDecidedIds.has(request.id),
      );
      this.persistRequests();
      this.requestsChange.emit(this.requests);
    } catch (error) {
      this.error =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Máy chủ phản hồi chậm. Yêu cầu mới vẫn sẽ hiện qua realtime; hãy thử làm mới lại.'
          : error instanceof Error
            ? error.message
            : 'Không tải được yêu cầu thanh toán.';
    } finally {
      clearTimeout(timeout);
      this.loading = false;
    }
  }

  async decide(id: string, decision: 'approve' | 'reject'): Promise<void> {
    if (this.busyRequestIds.has(id) || !this.adminToken) return;
    const original = this.requests.find((request) => request.id === id);
    if (!original) return;

    this.busyRequestIds.add(id);
    this.locallyDecidedIds.add(id);
    this.error = '';
    this.notice = 'Đang lưu quyết định…';
    // Gỡ khỏi hàng chờ ngay; nếu server từ chối, khôi phục dòng để admin thử lại.
    this.requests = this.requests.filter((request) => request.id !== id);
    this.persistRequests();
    this.requestsChange.emit(this.requests);
    try {
      const response = await this.paymentApi.decide(id, decision, this.adminToken);
      if (response.status === 401 || response.status === 403) {
        this.requests = this.mergePending([original], this.requests);
        this.locallyDecidedIds.delete(id);
        this.logout();
        this.error = 'Phiên admin hết hạn. Đăng nhập lại.';
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Không thể cập nhật yêu cầu thanh toán.');
      }
      this.persistRequests();
      this.requestsChange.emit(this.requests);
      this.notice = decision === 'approve' ? 'Đã duyệt thanh toán.' : 'Đã từ chối yêu cầu.';
    } catch (error) {
      this.locallyDecidedIds.delete(id);
      this.requests = this.mergePending([original], this.requests);
      this.persistRequests();
      this.requestsChange.emit(this.requests);
      this.error =
        error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu thanh toán.';
      this.notice = '';
    } finally {
      this.busyRequestIds.delete(id);
    }
  }

  logout(): void {
    const token = this.adminToken;
    if (token) void this.paymentApi.adminLogout(token);
    this.realtime.disconnect();
    try {
      localStorage.removeItem('cinema_admin_token');
      localStorage.removeItem('cinema_admin_pending_cache');
    } catch {}
    this.adminToken = '';
    this.requests = [];
    this.requestsChange.emit(this.requests);
    this.notice = '';
    this.authenticatedChange.emit(false);
  }

  private addIncomingRequest(request: PaymentRequestView): void {
    if (this.locallyDecidedIds.has(request.id)) return;
    if (this.loading) this.incomingDuringLoad.push(request);
    this.requests = this.mergePending([request], this.requests);
    this.persistRequests();
    this.requestsChange.emit(this.requests);
    this.notice = 'Có yêu cầu thanh toán mới.';
  }

  private persistRequests(): void {
    try {
      localStorage.setItem('cinema_admin_pending_cache', JSON.stringify(this.requests));
    } catch {}
  }

  private readCachedRequests(): PaymentRequestView[] {
    try {
      const cached: unknown = JSON.parse(
        localStorage.getItem('cinema_admin_pending_cache') ?? '[]',
      );
      if (!Array.isArray(cached)) return [];
      return cached.filter(
        (value): value is PaymentRequestView =>
          !!value &&
          typeof value === 'object' &&
          typeof (value as PaymentRequestView).id === 'string' &&
          typeof (value as PaymentRequestView).createdAt === 'number',
      );
    } catch {
      return [];
    }
  }

  private mergePending(...groups: PaymentRequestView[][]): PaymentRequestView[] {
    const unique = new Map<string, PaymentRequestView>();
    for (const request of groups.flat()) unique.set(request.id, request);
    return [...unique.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  private readSavedToken(): string {
    try {
      return localStorage.getItem('cinema_admin_token') ?? '';
    } catch {
      return '';
    }
  }
}
