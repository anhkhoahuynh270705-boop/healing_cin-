import { Injectable } from '@angular/core';
import { UserNotification } from '../../model/cinema-page.model';

@Injectable({ providedIn: 'root' })
export class NotificationStoreService {
  notifications: UserNotification[] = [];
  private storageKey = '';

  activate(ownerId: string): void {
    this.storageKey = `healing_notifications:${ownerId}`;
    try {
      const saved = localStorage.getItem(this.storageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      this.notifications = Array.isArray(parsed)
        ? parsed
            .filter(
              (item): item is UserNotification =>
                !!item &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                typeof item.message === 'string' &&
                typeof item.createdAt === 'number' &&
                typeof item.read === 'boolean' &&
                ['success', 'error', 'info'].includes(item.kind),
            )
            .slice(0, 40)
        : [];
    } catch {
      this.notifications = [];
    }
  }

  markAllRead(): void {
    this.notifications = this.notifications.map((notification) => ({ ...notification, read: true }));
    this.save();
  }

  clear(): void {
    this.notifications = [];
    this.save();
  }

  add(title: string, message: string, kind: UserNotification['kind']): void {
    this.notifications = [
      { id: crypto.randomUUID(), title, message, kind, createdAt: Date.now(), read: false },
      ...this.notifications,
    ].slice(0, 40);
    this.save();
  }

  private save(): void {
    if (!this.storageKey) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
    } catch {}
  }
}
