import { Injectable } from '@angular/core';
import { VipTierInfo } from '../models/vip-tier.model';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private get baseUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:8080';
    return `${location.protocol}//${location.hostname || 'localhost'}:8080`;
  }

  requestApproval(
    userId: string,
    username: string,
    authToken: string,
    tier: VipTierInfo,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/api/payments/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        authToken,
        tier: tier.tier,
        amount: tier.price,
        memo: `HEALING VIP${tier.tier} ${username}`,
      }),
    });
  }

  requestPrivateRoom(
    userId: string,
    username: string,
    authToken: string,
    roomName: string,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/api/payments/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username,
        authToken,
        tier: 0,
        amount: 10000,
        type: 'PRIVATE_ROOM',
        roomName,
        memo: `HEALING PHONG RIENG ${username}`,
      }),
    });
  }

  getStatus(userId: string, token: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/payments/status?userId=${encodeURIComponent(userId)}`, {
      headers: { 'X-User-Token': token },
    });
  }

  adminLogin(username: string, password: string, key: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, key }),
    });
  }

  adminRegister(username: string, password: string, key: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, key }),
    });
  }

  getPending(adminToken: string, signal?: AbortSignal): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/payments`, {
      headers: { 'X-Admin-Token': adminToken },
      signal,
    });
  }

  adminLogout(adminToken: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/logout`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
    });
  }

  decide(id: string, decision: 'approve' | 'reject', adminToken: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/admin/payments/${id}/${decision}`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
    });
  }
}
