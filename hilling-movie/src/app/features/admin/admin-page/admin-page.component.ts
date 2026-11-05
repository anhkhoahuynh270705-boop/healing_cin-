import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PaymentReviewComponent } from '../payment-review/payment-review.component';
import { AdminLoginPageComponent } from '../admin_login-page/admin-login-page.component';
import { AdminRegisterPageComponent } from '../admin_register-page/admin-register-page.component';
import { PaymentRequestView } from '../../payment/models/vip-tier.model';
import { AdminRealtimeService } from '../data-access/admin-realtime.service';
import { PaymentApiService } from '../../payment/data-access/payment-api.service';
import { UserManagementPageComponent } from '../user-management-page/user-management-page.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    RouterLink,
    PaymentReviewComponent,
    AdminLoginPageComponent,
    AdminRegisterPageComponent,
    UserManagementPageComponent,
  ],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  adminAuthenticated = false;
  adminAuthPage: 'login' | 'register' = 'login';
  adminTab: 'overview' | 'payments' | 'donations' | 'rooms' | 'users' = 'overview';
  pendingRequests: PaymentRequestView[] = [];

  constructor(
    private readonly paymentApi: PaymentApiService,
    private readonly realtime: AdminRealtimeService,
  ) {}

  get pageTitle(): string {
    return this.adminTab === 'overview'
      ? 'Tổng quan'
      : this.adminTab === 'rooms'
        ? 'Phòng chiếu'
        : this.adminTab === 'donations'
          ? 'Duyệt ủng hộ'
          : this.adminTab === 'users'
            ? 'Người dùng'
            : 'Duyệt khung chat VIP';
  }

  get pendingVipCount(): number {
    return this.pendingRequests.filter((request) => !request.type || request.type === 'VIP').length;
  }

  get pendingDonationCount(): number {
    return this.pendingRequests.filter((request) => request.type === 'DONATION').length;
  }

  get pendingRoomCount(): number {
    return this.pendingRequests.filter((request) => request.type === 'PRIVATE_ROOM').length;
  }

  selectTab(tab: 'overview' | 'payments' | 'donations' | 'rooms' | 'users'): void {
    this.adminTab = tab;
  }

  onRequestsChange(requests: PaymentRequestView[]): void {
    this.pendingRequests = requests;
  }

  onAuthenticationChange(authenticated: boolean): void {
    this.adminAuthenticated = authenticated;
  }

  showAdminRegister(): void {
    this.adminAuthPage = 'register';
  }

  onAdminRegistered(): void {
    this.adminAuthPage = 'login';
  }

  logoutAdmin(): void {
    let token = '';
    try {
      token = localStorage.getItem('cinema_admin_token') ?? '';
      localStorage.removeItem('cinema_admin_token');
      localStorage.removeItem('cinema_admin_pending_cache');
    } catch {}
    if (token) void this.paymentApi.adminLogout(token);
    this.realtime.disconnect();
    this.adminAuthenticated = false;
    this.adminAuthPage = 'login';
    this.pendingRequests = [];
  }
}
