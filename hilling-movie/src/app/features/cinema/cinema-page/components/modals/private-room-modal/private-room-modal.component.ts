import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserProfile } from '../../../../../auth/models/user-profile.model';
import { PaymentApiService } from '../../../../../payment/data-access/payment-api.service';
import { PrivateRoomView } from '../../../../model/cinema-page.model';

interface PrivateRoomNotice {
  message: string;
  title?: string;
  kind?: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-private-room-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './private-room-modal.component.html',
  styleUrl: './private-room-modal.component.scss',
})
export class PrivateRoomModalComponent {
  @Input() user: UserProfile | null = null;
  @Input() isAuthenticated = false;
  @Input() walletBalance = 0;
  @Input() pending = false;
  @Input() rooms: PrivateRoomView[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() enterRoom = new EventEmitter<string>();
  @Output() loginRequested = new EventEmitter<void>();
  @Output() requestPending = new EventEmitter<void>();
  @Output() roomCreated = new EventEmitter<PrivateRoomView>();
  @Output() refreshWallet = new EventEmitter<void>();
  @Output() refreshStatus = new EventEmitter<void>();
  @Output() sessionExpired = new EventEmitter<void>();
  @Output() notice = new EventEmitter<PrivateRoomNotice>();

  readonly roomForm = new FormGroup({ name: new FormControl('', { nonNullable: true }) });
  readonly inviteControl = new FormControl('', { nonNullable: true });
  submitting = false;

  get qrUrl(): string {
    const memo = `HEALING PHONG RIENG ${this.user?.username || 'KHACH'}`;
    return `https://img.vietqr.io/image/TCB-1221868856-compact2.png?amount=10000&addInfo=${encodeURIComponent(memo)}`;
  }

  async requestBankTransfer(): Promise<void> {
    if (!this.requireAuthenticated('Đăng nhập để gửi yêu cầu tạo phòng riêng.')) return;
    if (!this.canSubmit()) return;

    this.submitting = true;
    try {
      const response = await this.paymentApi.requestPrivateRoom(
        this.user!.id,
        this.user!.username,
        this.readUserToken(),
        this.roomName,
      );
      if (response.status === 401) {
        this.sessionExpired.emit();
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Máy chủ từ chối yêu cầu (HTTP ${response.status}).`);
      }
      if (typeof data?.id !== 'string' || data.type !== 'PRIVATE_ROOM' || data.status !== 'PENDING') {
        throw new Error('Máy chủ chưa xác nhận đã lưu yêu cầu. Vui lòng thử lại sau.');
      }

      this.requestPending.emit();
      this.notice.emit({
        message: 'Đã gửi yêu cầu phòng riêng. Admin sẽ duyệt sau khi xác nhận 10.000đ.',
        title: 'Yêu cầu tạo phòng đã gửi',
        kind: 'info',
      });
      this.refreshStatus.emit();
    } catch (error) {
      this.notice.emit({
        message: error instanceof Error ? error.message : 'Không kết nối được máy chủ.',
        title: 'Không thể gửi yêu cầu tạo phòng',
        kind: 'error',
      });
    } finally {
      this.submitting = false;
    }
  }

  async payFromWallet(): Promise<void> {
    if (!this.requireAuthenticated('Đăng nhập để thanh toán phòng riêng bằng số dư ví.')) return;
    if (!this.canSubmit()) return;
    if (this.walletBalance < 10_000) {
      this.notice.emit({ message: 'Số dư ví ủng hộ cần tối thiểu 10.000đ.' });
      return;
    }

    this.submitting = true;
    try {
      const response = await this.paymentApi.createPrivateRoomFromWallet(
        this.user!.id,
        this.user!.username,
        this.readUserToken(),
        this.roomName,
      );
      if (response.status === 401) {
        this.sessionExpired.emit();
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Không thể thanh toán (HTTP ${response.status}).`);
      }
      if (
        data?.type !== 'PRIVATE_ROOM' ||
        data?.status !== 'APPROVED' ||
        typeof data?.roomCode !== 'string' ||
        !/^private-[a-z0-9-]{8,64}$/i.test(data.roomCode)
      ) {
        throw new Error('Máy chủ chưa xác nhận giao dịch tạo phòng. Vui lòng kiểm tra lại.');
      }

      const room = { code: data.roomCode, name: data.roomName || this.roomName };
      this.roomCreated.emit(room);
      this.notice.emit({
        message: `Đã thanh toán 10.000đ từ ví. Phòng “${room.name}” đã được tạo.`,
        title: 'Tạo phòng riêng thành công',
        kind: 'success',
      });
      this.refreshWallet.emit();
      this.refreshStatus.emit();
    } catch (error) {
      this.notice.emit({
        message: error instanceof Error ? error.message : 'Không thể thanh toán bằng ví lúc này.',
        title: 'Thanh toán phòng riêng thất bại',
        kind: 'error',
      });
    } finally {
      this.submitting = false;
    }
  }

  enterByInvite(): void {
    const code = this.inviteControl.value.trim();
    if (!code) {
      this.notice.emit({ message: 'Dán mã mời phòng để tiếp tục.' });
      return;
    }
    this.enterRoom.emit(code);
  }

  copyCode(code: string): void {
    void this.copyValue(code, `mã phòng ${code}`);
  }

  copyLink(code: string): void {
    const inviteUrl = new URL(location.href);
    inviteUrl.searchParams.set('room', code);
    void this.copyValue(inviteUrl.toString(), `link mời phòng ${code}`);
  }

  private get roomName(): string {
    return this.roomForm.controls.name.value.trim();
  }

  private requireAuthenticated(message: string): boolean {
    if (this.isAuthenticated && this.user) return true;
    this.notice.emit({ message });
    return false;
  }

  private canSubmit(): boolean {
    if (this.pending || this.submitting) {
      this.notice.emit({ message: 'Vui lòng đợi yêu cầu hiện tại được xử lý.' });
      return false;
    }
    if (!this.roomName || this.roomName.length > 40) {
      this.notice.emit({ message: 'Nhập tên phòng từ 1 đến 40 ký tự.' });
      return false;
    }
    return true;
  }

  private async copyValue(value: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.notice.emit({ message: `Đã copy ${label}.` });
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
      this.notice.emit({ message: copied ? `Đã copy ${label}.` : `Không thể copy ${label}.` });
    }
  }

  private readUserToken(): string {
    try {
      return localStorage.getItem('healing_token') ?? '';
    } catch {
      return '';
    }
  }

  constructor(private readonly paymentApi: PaymentApiService) {}
}
