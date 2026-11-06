import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UserNotification } from '../model/cinema-page.model';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent {
  @Input() notifications: UserNotification[] = [];
  @Output() markRead = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();

  isOpen = false;
  popoverLeft = 0;
  popoverTop = 0;

  get unreadCount(): number {
    return this.notifications.filter((notification) => !notification.read).length;
  }

  toggle(event: MouseEvent): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) return;

    const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 20);
    this.popoverLeft = Math.max(
      10,
      Math.min(anchor.right + 12 - width, window.innerWidth - width - 10),
    );
    this.popoverTop = anchor.bottom + 10;
    this.markRead.emit();
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  }
}
