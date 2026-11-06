import { Injectable } from '@angular/core';
import { apiBaseUrl } from '../../../api-endpoints';

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
  private get baseUrl(): string {
    return apiBaseUrl();
  }

  list(token: string, query: string, page: number, size = 20): Promise<Response> {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) });
    return fetch(`${this.baseUrl}/api/admin/users?${params}`, {
      cache: 'no-store',
      headers: { 'X-Admin-Token': token },
    });
  }
}
