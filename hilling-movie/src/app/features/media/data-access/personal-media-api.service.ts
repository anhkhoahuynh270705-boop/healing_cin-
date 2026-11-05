import { Injectable } from '@angular/core';
import { apiBaseUrl } from '../../../api-endpoints';
import { PersonalMediaUploadResult } from '../models/personal-media.model';

@Injectable({ providedIn: 'root' })
export class PersonalMediaApiService {
  private get baseUrl(): string {
    return apiBaseUrl();
  }

  async upload(
    file: File,
    userId: string,
    token: string,
    guestSessionId: string,
    roomId: string,
    environment: 'indoor' | 'outdoor',
    durationSeconds: number,
  ): Promise<PersonalMediaUploadResult> {
    const body = new FormData();
    body.set('file', file);
    body.set('userId', userId);
    body.set('guestSessionId', guestSessionId);
    body.set('roomId', roomId);
    body.set('environment', environment);
    body.set('durationSeconds', String(durationSeconds));

    const response = await fetch(`${this.baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: { 'X-User-Token': token },
      body,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message ?? 'Không tải được nội dung lên màn ảnh.');
    }
    return (await response.json()) as PersonalMediaUploadResult;
  }

  mediaUrl(id: string): string {
    return `${this.baseUrl}/api/media/${encodeURIComponent(id)}`;
  }
}
