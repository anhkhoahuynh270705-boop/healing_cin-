import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
  private get baseUrl(): string {
    if (typeof window === 'undefined') return 'http://https://healing-cin.onrender.com';
    return `${location.protocol}//${location.hostname || 'localhost'}:8080`;
  }

  list(token: string, query: string, page: number, size = 20): Promise<Response> {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) });
    return fetch(`${this.baseUrl}/api/admin/users?${params}`, {
      headers: { 'X-Admin-Token': token },
    });
  }
}
