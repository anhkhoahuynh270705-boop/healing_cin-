import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminUserPage,
  AdminUserUpdate,
  AdminUserView,
} from '../model/admin.model';
import { AdminUserApiService } from '../data-access/admin-user-api.service';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
})
export class UserManagementPageComponent implements OnInit {
  @Output() sessionExpired = new EventEmitter<void>();

  readonly searchForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
  });
  readonly editForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(24)] }),
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    avatar: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(32)] }),
    vipTier: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(10)] }),
  });
  readonly vipTiers = Array.from({ length: 11 }, (_, tier) => tier);
  users: AdminUserView[] = [];
  loading = false;
  savingUser = false;
  deletingUserId: string | null = null;
  error = '';
  success = '';
  editingUser: AdminUserView | null = null;
  page = 0;
  totalPages = 0;
  totalUsers = 0;
  pageSize = 10;
  private adminToken = '';

  private readonly usersApi = inject(AdminUserApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  ngOnInit(): void {
    try {
      this.adminToken = localStorage.getItem('cinema_admin_token') ?? '';
    } catch {}
    if (!this.adminToken) {
      this.sessionExpired.emit();
      return;
    }
    void this.load();
  }

  search(): void {
    this.page = 0;
    void this.load();
  }

  changePage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    void this.load();
  }

  async load(): Promise<void> {
    if (!this.adminToken || this.loading) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    try {
      const response = await this.usersApi.list(
        this.adminToken,
        this.searchForm.controls.query.value.trim(),
        this.page,
        this.pageSize,
      );
      if (response.status === 401 || response.status === 403) {
        this.sessionExpired.emit();
        return;
      }
      const body = (await response.json()) as AdminUserPage | { message?: string };
      if (!response.ok || !('content' in body)) {
        throw new Error(('message' in body && body.message) || 'Không tải được danh sách user.');
      }
      this.users = body.content;
      this.totalUsers = body.totalElements;
      this.totalPages = body.totalPages;
      this.page = body.number;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không tải được danh sách user.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  editUser(user: AdminUserView): void {
    this.error = '';
    this.success = '';
    this.editingUser = user;
    this.editForm.reset({
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar || '🧸',
      vipTier: user.vipTier,
    });
  }

  closeEditor(): void {
    if (this.savingUser) return;
    this.editingUser = null;
  }

  async saveUser(): Promise<void> {
    const user = this.editingUser;
    if (!user || this.editForm.invalid || this.savingUser) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.savingUser = true;
    this.error = '';
    this.success = '';
    const update: AdminUserUpdate = this.editForm.getRawValue();
    try {
      const response = await this.usersApi.update(this.adminToken, user.id, update);
      if (response.status === 401 || response.status === 403) {
        this.sessionExpired.emit();
        return;
      }
      const body = (await response.json()) as AdminUserView | { message?: string };
      if (!response.ok || !('id' in body)) {
        throw new Error(('message' in body && body.message) || 'Không cập nhật được tài khoản.');
      }
      this.users = this.users.map((item) => item.id === body.id ? body : item);
      this.editingUser = null;
      this.success = `Đã cập nhật tài khoản ${body.username}.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không cập nhật được tài khoản.';
    } finally {
      this.savingUser = false;
      this.cdr.markForCheck();
    }
  }

  async deleteUser(user: AdminUserView): Promise<void> {
    if (this.deletingUserId || this.loading) return;
    const confirmed = typeof window !== 'undefined' && window.confirm(
      `Xóa tài khoản “${user.username}”? Người dùng sẽ bị đăng xuất và không thể đăng nhập lại. Lịch sử yêu cầu thanh toán vẫn được giữ trong trang admin.`,
    );
    if (!confirmed) return;

    this.deletingUserId = user.id;
    this.error = '';
    this.success = '';
    try {
      const response = await this.usersApi.delete(this.adminToken, user.id);
      if (response.status === 401 || response.status === 403) {
        this.sessionExpired.emit();
        return;
      }
      const body = (await response.json()) as { deleted?: boolean; message?: string };
      if (!response.ok || !body.deleted) {
        throw new Error(body.message || 'Không xóa được tài khoản.');
      }
      this.users = this.users.filter((item) => item.id !== user.id);
      this.totalUsers = Math.max(0, this.totalUsers - 1);
      this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
      if (!this.users.length && this.page > 0) this.page--;
      await this.load();
      this.success = `Đã xóa tài khoản ${user.username}.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không xóa được tài khoản.';
    } finally {
      this.deletingUserId = null;
      this.cdr.markForCheck();
    }
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
  }
}
