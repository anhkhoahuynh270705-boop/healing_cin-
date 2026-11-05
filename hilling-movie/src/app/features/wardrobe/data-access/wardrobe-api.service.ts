import { Injectable } from '@angular/core';
import { WardrobeAccount, WardrobeCatalogItem } from '../models/wardrobe.model';

@Injectable({ providedIn: 'root' })
export class WardrobeApiService {
  private catalogRequest?: Promise<WardrobeCatalogItem[]>;

  private get baseUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:8080';
    return `${location.protocol}//${location.hostname || 'localhost'}:8080`;
  }

  async getCatalog(): Promise<WardrobeCatalogItem[]> {
    if (!this.catalogRequest) {
      this.catalogRequest = fetch(`${this.baseUrl}/api/wardrobe/catalog`).then(async (response) => {
        if (!response.ok) throw new Error('Không tải được danh sách vật phẩm.');
        return (await response.json()) as WardrobeCatalogItem[];
      });
      this.catalogRequest.catch(() => (this.catalogRequest = undefined));
    }
    return this.catalogRequest;
  }

  async getAccount(userId: string, token: string): Promise<WardrobeAccount> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(`${this.baseUrl}/api/wardrobe/me?${params}`, {
      headers: { 'X-User-Token': token },
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không tải được tủ đồ của bạn.',
      );
    }
    return (await response.json()) as WardrobeAccount;
  }

  async purchase(userId: string, token: string, tier: number): Promise<WardrobeAccount> {
    const response = await fetch(`${this.baseUrl}/api/wardrobe/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, authToken: token, tier }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message ?? 'Không mua được bộ vật phẩm.');
    }
    return (await response.json()) as WardrobeAccount;
  }

  formatAmount(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  }
}
