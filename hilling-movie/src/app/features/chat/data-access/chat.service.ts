import { inject, Injectable } from '@angular/core';
import { RoomSocketService } from '../../room/data-access/room-socket.service';

/** Facade chat: phần giao diện gọi nghiệp vụ chat thay vì gửi STOMP trực tiếp. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly roomSocket = inject(RoomSocketService);

  sendMessage(text: string, vipTier: number): void {
    this.roomSocket.sendChat(text, vipTier);
  }

  sendReaction(emoji: string): void {
    this.roomSocket.sendReaction(emoji);
  }
}
