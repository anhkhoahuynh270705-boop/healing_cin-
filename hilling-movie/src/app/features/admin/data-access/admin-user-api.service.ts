import { Injectable } from '@angular/core';
import { apiBaseUrl } from '../../../api-endpoints';
import { AdminUserUpdate } from '../model/admin.model';

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

  update(token: string, userId: string, user: AdminUserUpdate): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify(user),
    });
  }

  delete(token: string, userId: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      cache: 'no-store',
      headers: { 'X-Admin-Token': token },
    });
  }
}
