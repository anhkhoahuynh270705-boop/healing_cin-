import { Injectable } from '@angular/core';
import { TaskProgress } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private get baseUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:8080';
    return `${location.protocol}//${location.hostname || 'localhost'}:8080`;
  }

  async getProgress(userId: string, token: string): Promise<TaskProgress> {
    const query = new URLSearchParams({ userId });
    const response = await fetch(`${this.baseUrl}/api/tasks/me?${query}`, {
      headers: { 'X-User-Token': token },
    });
    if (!response.ok) throw new Error(await this.errorMessage(response));
    return (await response.json()) as TaskProgress;
  }

  async claim(userId: string, token: string, taskId: string): Promise<TaskProgress> {
    const response = await fetch(`${this.baseUrl}/api/tasks/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, authToken: token, taskId }),
    });
    if (!response.ok) throw new Error(await this.errorMessage(response));
    return (await response.json()) as TaskProgress;
  }

  private async errorMessage(response: Response): Promise<string> {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return (
      payload?.message ??
      (response.status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không tải được nhiệm vụ.')
    );
  }
}
