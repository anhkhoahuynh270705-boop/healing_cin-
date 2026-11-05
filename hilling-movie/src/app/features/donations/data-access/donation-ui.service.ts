import { Injectable } from '@angular/core';
import { DonationAccount, DonationSubmission, DonationUiConfig } from '../models/donation.model';

/** API config, số dư và yêu cầu ủng hộ của người dùng. */
@Injectable({ providedIn: 'root' })
export class DonationUiService {
  private get baseUrl(): string {
    if (typeof window === 'undefined') return 'http://https://healing-cin.onrender.com';
    return `${location.protocol}//${location.hostname || 'localhost'}:8080`;
  }

  async getConfig(): Promise<DonationUiConfig> {
    const response = await fetch(`${this.baseUrl}/api/donations/config`);
    if (!response.ok) throw new Error('Không tải được thông tin chuyển khoản.');
    return (await response.json()) as DonationUiConfig;
  }

  async getAccount(userId: string, token: string, statusOnly = false): Promise<DonationAccount> {
    const endpoint = statusOnly ? '/api/donations/me/status' : '/api/donations/me';
    const params = new URLSearchParams({ userId });
    const response = await fetch(`${this.baseUrl}${endpoint}?${params}`, {
      headers: { 'X-User-Token': token },
    });
    if (!response.ok)
      throw new Error(
        response.status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không tải được số dư ủng hộ.',
      );
    return (await response.json()) as DonationAccount;
  }

  async submit(userId: string, token: string, amount: number): Promise<DonationSubmission> {
    const response = await fetch(`${this.baseUrl}/api/donations/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, authToken: token, amount }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message ?? 'Không gửi được yêu cầu duyệt giao dịch.');
    }
    return (await response.json()) as DonationSubmission;
  }

  formatAmount(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  }

  buildQrUrl(config: DonationUiConfig, amount: number, transferCode: string): string {
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: transferCode,
      accountName: config.accountName,
    });
    return `https://img.vietqr.io/image/${config.bankCode}-${config.accountNumber}-compact2.png?${params}`;
  }
}
