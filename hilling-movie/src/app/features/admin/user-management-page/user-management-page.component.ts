import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AdminUserPage,
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
  users: AdminUserView[] = [];
  loading = false;
  error = '';
  page = 0;
  totalPages = 0;
  totalUsers = 0;
  pageSize = 20;
  private adminToken = '';

  private readonly usersApi = inject(AdminUserApiService);
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
    }
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }
}
