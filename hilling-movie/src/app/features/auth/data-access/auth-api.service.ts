import { Injectable } from '@angular/core';
import { apiBaseUrl } from '../../../api-endpoints';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private get baseUrl(): string {
    return apiBaseUrl();
  }

  login(username: string, password: string): Promise<Response> {
    return this.post('/api/auth/login', { username, password });
  }

  register(username: string, password: string, displayName: string): Promise<Response> {
    return this.post('/api/auth/register', { username, password, displayName });
  }

  updateProfile(profile: Record<string, unknown>): Promise<Response> {
    return this.post('/api/auth/profile', profile);
  }

  private post(path: string, body: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
}
