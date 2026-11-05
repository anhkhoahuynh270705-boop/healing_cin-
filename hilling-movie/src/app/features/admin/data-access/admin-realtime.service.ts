import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { PaymentRequestView } from '../../payment/models/vip-tier.model';

@Injectable({ providedIn: 'root' })
export class AdminRealtimeService {
  readonly connected$ = new BehaviorSubject(false);
  readonly paymentRequest$ = new Subject<PaymentRequestView>();

  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private token = '';
  private incoming = '';
  private intentionallyClosed = true;

  constructor(private readonly ngZone: NgZone) {}

  connect(token: string): void {
    if (!token || typeof window === 'undefined') return;
    if (
      this.token === token &&
      (this.socket?.readyState === WebSocket.OPEN ||
        this.socket?.readyState === WebSocket.CONNECTING)
    )
      return;
    this.disconnect();
    this.token = token;
    this.intentionallyClosed = false;
    this.open();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    clearTimeout(this.reconnectTimer);
    this.token = '';
    this.connected$.next(false);
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, 'Admin logged out');
    }
  }

  private open(): void {
    if (this.intentionallyClosed || !this.token) return;
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${location.hostname || 'localhost'}:8080/ws`);
    this.socket = socket;
    this.incoming = '';

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.sendFrame(
        `CONNECT\naccept-version:1.2\nhost:${location.host || 'localhost:4200'}\nx-admin-token:${this.token}\nheart-beat:0,0\n\n\0`,
      );
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (this.socket !== socket) return;
      this.ngZone.run(() => {
        this.incoming += String(event.data);
        this.readFrames();
      });
    };
    socket.onerror = () => this.ngZone.run(() => this.connected$.next(false));
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.ngZone.run(() => {
        this.connected$.next(false);
        if (!this.intentionallyClosed && this.token) {
          this.reconnectTimer = setTimeout(() => this.open(), 1200);
        }
      });
    };
  }

  private readFrames(): void {
    let end = this.incoming.indexOf('\0');
    while (end >= 0) {
      const frame = this.incoming.slice(0, end).replace(/\r\n/g, '\n');
      this.incoming = this.incoming.slice(end + 1);
      if (frame.trim()) this.handleFrame(frame);
      while (this.incoming.startsWith('\n')) this.incoming = this.incoming.slice(1);
      end = this.incoming.indexOf('\0');
    }
  }

  private handleFrame(frame: string): void {
    const bodyStart = frame.indexOf('\n\n');
    const lines = (bodyStart < 0 ? frame : frame.slice(0, bodyStart)).split('\n');
    const command = lines.shift()?.trim();
    const headers: Record<string, string> = {};
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon > 0) headers[line.slice(0, colon)] = line.slice(colon + 1);
    }
    const body = bodyStart < 0 ? '' : frame.slice(bodyStart + 2);

    if (command === 'CONNECTED') {
      this.connected$.next(true);
      this.sendFrame(
        'SUBSCRIBE\nid:admin-payments\ndestination:/user/queue/admin/payments\nack:auto\n\n\0',
      );
      return;
    }
    if (command === 'MESSAGE' && headers['destination']?.includes('/queue/admin/payments')) {
      try {
        this.paymentRequest$.next(JSON.parse(body) as PaymentRequestView);
      } catch {
        // Bỏ gói tin lỗi; lần tải danh sách tiếp theo sẽ đồng bộ lại từ PostgreSQL.
      }
    }
    if (command === 'ERROR') this.socket?.close(1008, headers['message'] || 'Admin STOMP rejected');
  }

  private sendFrame(frame: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(frame);
  }
}
