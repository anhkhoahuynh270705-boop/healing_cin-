import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Guest, Movement, RoomState } from '../../models';
import { Reaction } from '../../../chat/models/reaction.model';
import { RoomSocketService } from '../../data-access/room-socket.service';


const SEAT_DEPTHS = [0.4, 0.62, 0.84, 1.06, 1.28, 1.5];
const SEAT_COLUMNS = [0.06, 0.14, 0.22, 0.3, 0.38, 0.44, 0.56, 0.62, 0.7, 0.78, 0.86, 0.94];
type WorldPoint = { x: number; y: number };
type MovingGuest = Guest & { tx: number; ty: number; walkingUntil: number };

@Component({
  selector: 'app-room-scene',
  standalone: true,
  template: `
    <div class="pixel-room-wrap">
      <canvas
        #roomCanvas
        (pointerdown)="onCanvasPointer($event)"
        aria-label="Khán phòng pixel art góc nhìn isometric. Nhấp ghế để ngồi, nhấp sàn để di chuyển."
      ></canvas>
      <div class="room-sign">
        <span class="sign-lamp"></span> PHÒNG CHIẾU SỐ 01
        <span class="sign-lamp"></span>
      </div>
    </div>
    <div class="move-help">
      <span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span
      ><span class="keycap">D</span
      ><span>hoặc phím mũi tên để đi · nhấp ghế trống để ngồi · nhấp lối đi để bước tới</span>
    </div>
    <div class="mobile-pad" aria-label="Điều khiển di chuyển">
      <button
        (pointerdown)="beginMove('up', $event)"
        (pointerup)="endMove('up')"
        (pointercancel)="endMove('up')"
        aria-label="Đi lên"
      >
        <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
      </button>
      <button
        (pointerdown)="beginMove('left', $event)"
        (pointerup)="endMove('left')"
        (pointercancel)="endMove('left')"
        aria-label="Đi sang trái"
      >
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
      </button>
      <button
        (pointerdown)="beginMove('down', $event)"
        (pointerup)="endMove('down')"
        (pointercancel)="endMove('down')"
        aria-label="Đi xuống"
      >
        <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
      </button>
      <button
        (pointerdown)="beginMove('right', $event)"
        (pointerup)="endMove('right')"
        (pointercancel)="endMove('right')"
        aria-label="Đi sang phải"
      >
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </button>
    </div>
  `,
})
export class RoomSceneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('roomCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() state: RoomState | null = null;
  @Input() sessionId: string | null = null;
  @Input() guestName = 'Bạn';
  @Output() move = new EventEmitter<Movement>();
  @Output() seatClaim = new EventEmitter<number>();

  private ctx!: CanvasRenderingContext2D;
  private frameId = 0;
  private lastFrame = performance.now();
  private lastMoveSent = 0;
  private destination: WorldPoint | null = null;
  private readonly keys = new Set<string>();
  private readonly guests = new Map<string, MovingGuest>();
  private readonly reactions: Array<Reaction & { receivedAt: number }> = [];
  private readonly subscriptions = new Subscription();
  private local: MovingGuest = {
    id: '',
    name: '',
    avatar: '',
    x: 0.5,
    y: 0.7,
    tx: 0.5,
    ty: 0.7,
    face: 1,
    seat: null,
    walkingUntil: 0,
  };
  private resizeObserver?: ResizeObserver;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (/INPUT|TEXTAREA/.test((document.activeElement as HTMLElement | null)?.tagName ?? ''))
      return;
    const direction = this.keyDirection(event.key);
    if (direction) {
      event.preventDefault();
      this.keys.add(direction);
      this.destination = null;
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const direction = this.keyDirection(event.key);
    if (direction) this.keys.delete(direction);
  };

  constructor(
    private readonly roomSocket: RoomSocketService,
    private readonly zone: NgZone,
  ) {
    this.subscriptions.add(
      this.roomSocket.movement$.subscribe((movement) => this.onMovement(movement)),
    );
    this.subscriptions.add(
      this.roomSocket.reaction$.subscribe((reaction) =>
        this.reactions.push({ ...reaction, receivedAt: performance.now() }),
      ),
    );
  }

  ngAfterViewInit(): void {
    // The prerendered server has no canvas animation or browser event APIs.
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(canvas);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearKeys);
    this.resizeCanvas();
    this.zone.runOutsideAngular(() => (this.frameId = requestAnimationFrame(this.animate)));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['guestName']) this.local.name = this.guestName;
    if (!this.state) return;
    const live = new Set<string>();
    for (const guest of this.state.guests) {
      live.add(guest.id);
      if (guest.id === this.sessionId) {
        if (this.local.id !== guest.id) {
          this.local.id = guest.id;
          this.local.x = guest.x;
          this.local.y = guest.y;
          this.local.tx = guest.x;
          this.local.ty = guest.y;
          this.local.seat = guest.seat;
        }
        this.local.name = guest.name;
        this.local.avatar = guest.avatar;
        if (guest.seat !== this.local.seat) {
          this.local.seat = guest.seat;
          if (guest.seat !== null) {
            this.local.x = guest.x;
            this.local.y = guest.y;
            this.local.tx = guest.x;
            this.local.ty = guest.y;
            this.destination = null;
          }
        }
        continue;
      }
      const existing = this.guests.get(guest.id);
      if (existing)
        Object.assign(existing, {
          name: guest.name,
          avatar: guest.avatar,
          tx: guest.x,
          ty: guest.y,
          face: guest.face,
          seat: guest.seat,
        });
      else
        this.guests.set(guest.id, {
          ...guest,
          tx: guest.x,
          ty: guest.y,
          walkingUntil: 0,
        });
    }
    for (const id of this.guests.keys()) if (!live.has(id)) this.guests.delete(id);
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined' && this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.resizeObserver?.disconnect();
    this.subscriptions.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.clearKeys);
    }
  }

  private readonly clearKeys = (): void => this.keys.clear();

  beginMove(direction: string, event: PointerEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.keys.add(direction);
    this.destination = null;
  }
  endMove(direction: string): void {
    this.keys.delete(direction);
  }

  onCanvasPointer(event: PointerEvent): void {
    const canvas = this.canvasRef.nativeElement,
      rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left,
      sy = event.clientY - rect.top;
    for (let index = 0; index < SEAT_DEPTHS.length * SEAT_COLUMNS.length; index++) {
      const world = this.seatPosition(index),
        point = this.project(world.x, world.y, rect.width, rect.height);
      const scale = 0.72 + (world.x + world.y) * 0.18;
      if (
        Math.abs(sx - point.x) < 16 * scale &&
        sy >= point.y - 23 * scale &&
        sy <= point.y + 5 * scale
      ) {
        this.seatClaim.emit(index);
        this.destination = null;
        return;
      }
    }
    const u = (sx / rect.width - 0.5) / 0.39,
      v = (sy / rect.height - 0.27) / 0.24;
    const x = (u + v) / 2,
      y = (v - u) / 2;
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1)
      this.destination = {
        x: this.clamp(x, 0.04, 0.96),
        y: this.clamp(y, 0.04, 0.96),
      };
  }

  private readonly animate = (now: number): void => {
    const canvas = this.canvasRef.nativeElement,
      rect = canvas.getBoundingClientRect();
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const dirs: Record<string, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    let dx = 0,
      dy = 0;
    for (const key of this.keys) {
      const d = dirs[key];
      if (d) {
        dx += d[0];
        dy += d[1];
      }
    }
    if (!dx && !dy && this.destination) {
      dx = this.destination.x - this.local.x;
      dy = this.destination.y - this.local.y;
      if (Math.hypot(dx * rect.width, dy * rect.height) < 5) {
        this.destination = null;
        dx = 0;
        dy = 0;
      }
    }
    const moving = Boolean(dx || dy);
    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.local.x = this.clamp(this.local.x + dx * 0.31 * dt, 0.04, 0.96);
      this.local.y = this.clamp(this.local.y + dy * 0.31 * dt, 0.04, 0.96);
      this.local.seat = null;
      if (dx) this.local.face = dx < 0 ? -1 : 1;
      if (now - this.lastMoveSent > 100 && this.sessionId) {
        this.lastMoveSent = now;
        this.move.emit({
          id: this.sessionId,
          x: this.local.x,
          y: this.local.y,
          face: this.local.face,
        });
      }
    }
    this.draw(this.ctx, rect.width, rect.height, now, moving);
    this.frameId = requestAnimationFrame(this.animate);
  };

  private draw(
    g: CanvasRenderingContext2D,
    w: number,
    h: number,
    now: number,
    moving: boolean,
  ): void {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#201a29';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#34283d';
    g.fillRect(0, 0, w, h * 0.29);
    g.fillStyle = '#413148';
    g.fillRect(0, h * 0.23, w, h * 0.06);
    for (let x = 12; x < w; x += 56) {
      g.fillStyle = '#4d3a4b';
      g.fillRect(x, 4, 3, h * 0.22);
      g.fillStyle = '#392c40';
      g.fillRect(x + 4, 4, 2, h * 0.22);
    }
    for (const x of [w * 0.12, w * 0.88]) {
      g.fillStyle = '#73505b';
      g.fillRect(x - 10, h * 0.09, 20, 27);
      g.fillRect(x - 14, h * 0.12, 28, 15);
      g.fillStyle = '#f1c579';
      g.fillRect(x - 3, h * 0.105, 6, 13);
    }
    this.drawScreen(g, w, h);
    this.drawFloor(g, w, h);

    const depthItems: Array<
      | {
          kind: 'seat';
          x: number;
          y: number;
          index: number;
          scale: number;
          depth: number;
        }
      | { kind: 'guest'; guest: MovingGuest; depth: number }
      | { kind: 'mine'; depth: number }
    > = [];
    for (let index = 0; index < SEAT_DEPTHS.length * SEAT_COLUMNS.length; index++) {
      const p = this.seatPosition(index);
      depthItems.push({
        kind: 'seat',
        ...p,
        index,
        depth: p.x + p.y,
        scale: 0.72 + (p.x + p.y) * 0.18,
      });
    }
    for (const guest of this.guests.values()) {
      guest.x += (guest.tx - guest.x) * 0.24;
      guest.y += (guest.ty - guest.y) * 0.24;
      depthItems.push({ kind: 'guest', guest, depth: guest.x + guest.y });
    }
    if (this.sessionId) depthItems.push({ kind: 'mine', depth: this.local.x + this.local.y });
    depthItems.sort((a, b) => a.depth - b.depth || (a.kind === 'seat' ? -1 : 1));
    const occupied = new Set(
      (this.state?.guests ?? [])
        .map((guest) => guest.seat)
        .filter((seat): seat is number => seat !== null),
    );
    for (const item of depthItems) {
      if (item.kind === 'seat') {
        const p = this.project(item.x, item.y, w, h);
        this.drawSeat(g, p.x, p.y, item.scale, item.index, occupied.has(item.index));
      } else if (item.kind === 'guest') {
        const p = this.project(item.guest.x, item.guest.y, w, h);
        this.drawAvatar(g, p.x, p.y, item.guest, now, now < item.guest.walkingUntil);
      } else {
        const p = this.project(this.local.x, this.local.y, w, h);
        this.drawAvatar(g, p.x, p.y, this.local, now, moving);
      }
    }
    for (let i = this.reactions.length - 1; i >= 0; i--) {
      const reaction = this.reactions[i],
        age = (now - reaction.receivedAt) / 1000;
      if (age > 2) {
        this.reactions.splice(i, 1);
        continue;
      }
      const p = this.project(reaction.x, reaction.y, w, h),
        cell = Math.max(1.8, Math.min(3.2, (0.78 + (reaction.x + reaction.y) * 0.16) * 2.15));
      g.globalAlpha = Math.min(1, (2 - age) * 2);
      g.font = '20px sans-serif';
      g.textAlign = 'center';
      g.fillText(reaction.emoji, p.x, p.y - 24 * cell - age * 38);
      g.globalAlpha = 1;
    }
  }

  private drawScreen(g: CanvasRenderingContext2D, w: number, h: number): void {
    const x = w * 0.29,
      y = h * 0.035,
      width = w * 0.42,
      height = h * 0.205;
    g.fillStyle = '#17111d';
    g.fillRect(x - 12, y - 8, width + 24, height + 20);
    g.fillStyle = '#784f5d';
    g.fillRect(x - 9, y - 5, 8, height + 13);
    g.fillRect(x + width + 1, y - 5, 8, height + 13);
    for (let yy = y; yy < y + height; yy += 9) {
      g.fillStyle = yy % 2 ? '#9a6872' : '#674650';
      g.fillRect(x - 7, yy, 5, 5);
      g.fillRect(x + width + 2, yy, 5, 5);
    }
    g.fillStyle = '#d4a169';
    g.fillRect(x - 12, y - 10, width + 24, 4);
    g.fillStyle = '#ffdc9a';
    g.fillRect(x - 9, y - 12, width + 18, 2);
    g.fillStyle = '#756284';
    g.fillRect(x, y, width, height);
    g.fillStyle = '#947d9f';
    g.fillRect(x + width * 0.12, y + height * 0.15, width * 0.27, height * 0.25);
    g.fillStyle = '#c0a4b0';
    g.fillRect(x + width * 0.43, y + height * 0.1, width * 0.22, height * 0.2);
    g.fillStyle = '#604d70';
    g.fillRect(x + width * 0.71, y + height * 0.22, width * 0.19, height * 0.22);
    g.fillStyle = '#f4d49e';
    g.fillRect(x + width * 0.18, y + height * 0.76, width * 0.64, 2);
  }

  private drawFloor(g: CanvasRenderingContext2D, w: number, h: number): void {
    const far = this.project(0, 0, w, h),
      right = this.project(1, 0, w, h),
      near = this.project(1, 1, w, h),
      left = this.project(0, 1, w, h);
    this.fillPolygon(g, [far, right, near, left], '#302633');
    this.fillPolygon(
      g,
      [far, right, { x: right.x, y: right.y + 8 }, { x: far.x, y: far.y + 8 }],
      '#65506a',
    );
    this.fillPolygon(
      g,
      [right, near, { x: near.x, y: near.y + 8 }, { x: right.x, y: right.y + 8 }],
      '#382b39',
    );
    this.fillPolygon(
      g,
      [left, near, { x: near.x, y: near.y + 8 }, { x: left.x, y: left.y + 8 }],
      '#493442',
    );
    this.fillPolygon(g, [far, right, near, left], '#51404a');
    for (let i = 1; i < 8; i++) {
      const t = i / 8,
        a = this.project(t, 0, w, h),
        b = this.project(t, 1, w, h),
        c = this.project(0, t, w, h),
        d = this.project(1, t, w, h);
      g.strokeStyle = '#b78b6930';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.moveTo(c.x, c.y);
      g.lineTo(d.x, d.y);
      g.stroke();
    }
    this.fillPolygon(
      g,
      [
        this.project(0.465, 0, w, h),
        this.project(0.535, 0, w, h),
        this.project(0.535, 1, w, h),
        this.project(0.465, 1, w, h),
      ],
      '#392b3b',
    );
  }

  private drawSeat(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    index: number,
    occupied: boolean,
  ): void {
    const width = 22 * s,
      backHeight = 17 * s,
      tilt = 5 * s,
      top = y - backHeight - 3 * s;
    const shades = ['#714b59', '#78515c', '#684653'],
      velvet = occupied ? '#503d4a' : shades[index % shades.length];
    g.fillStyle = '#261d29';
    g.fillRect(x - width * 0.4, y - 3 * s, width * 0.8, 5 * s);
    this.fillPolygon(
      g,
      [
        { x: x - width * 0.46, y: y - 4 * s },
        { x: x + width * 0.42, y: y + tilt - 4 * s },
        { x: x + width * 0.42, y: y + tilt },
        { x: x - width * 0.46, y },
      ],
      '#3b2935',
    );
    this.fillPolygon(
      g,
      [
        { x: x - width * 0.4, y: top + tilt },
        { x: x + width * 0.4, y: top + tilt * 2 },
        { x: x + width * 0.4, y: y + tilt },
        { x: x - width * 0.4, y },
      ],
      velvet,
    );
    this.fillPolygon(
      g,
      [
        { x: x - width * 0.4, y: top + tilt },
        { x: x + width * 0.4, y: top + tilt * 2 },
        { x: x + width * 0.4, y: top + tilt * 2 + 3 * s },
        { x: x - width * 0.4, y: top + tilt + 3 * s },
      ],
      '#956775',
    );
    this.fillPolygon(
      g,
      [
        { x: x - width * 0.49, y: y - 9 * s },
        { x: x - width * 0.39, y: y - 8 * s },
        { x: x - width * 0.39, y: y + 2 * s },
        { x: x - width * 0.49, y: y + s },
      ],
      '#8d6953',
    );
    this.fillPolygon(
      g,
      [
        { x: x + width * 0.39, y: y - 8 * s },
        { x: x + width * 0.49, y: y - 9 * s },
        { x: x + width * 0.49, y: y + s },
        { x: x + width * 0.39, y: y + 2 * s },
      ],
      '#8d6953',
    );
    g.fillStyle = '#c09a68';
    g.fillRect(x - s, top + backHeight * 0.55, 2 * s, 2 * s);
  }

  private drawAvatar(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    guest: MovingGuest,
    now: number,
    moving: boolean,
  ): void {
    const seed = [...guest.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const depth = (guest.x + guest.y) / 2,
      cell = Math.max(1.8, Math.min(3.2, (0.78 + depth * 0.32) * 2.15));
    const shirts = ['#b783a1', '#8ca89a', '#d49b62', '#8298bf', '#bd806f', '#a18cc5', '#9fb37e'];
    const hair = ['#352531', '#49302a', '#292936', '#654638', '#29242a'];
    const shirt = shirts[seed % shirts.length],
      hairColor = hair[seed % hair.length],
      skin = ['#f0c6a0', '#d8a47f', '#f3d0ad', '#bd866b'][seed % 4];
    const head = 12 * cell,
      bodyH = 11 * cell,
      bodyW = 11 * cell,
      sitting = guest.seat !== null && !moving;
    const legs = sitting ? 0 : 4 * cell,
      step = moving ? Math.sin(now / 65 + seed) * 2 * cell : 0;
    const top = y - head - bodyH - legs + (moving ? Math.abs(Math.sin(now / 65 + seed)) * cell : 0);
    g.fillStyle = '#17131c77';
    g.fillRect(x - 7 * cell, y - 1.5 * cell, 14 * cell, 2 * cell);
    if (!sitting) {
      g.fillStyle = '#302936';
      g.fillRect(x - 4 * cell, y - legs + step, 3 * cell, legs);
      g.fillRect(x + cell, y - legs - step, 3 * cell, legs);
      g.fillStyle = '#201b24';
      g.fillRect(x - 5 * cell, y - 1.2 * cell + step, 4 * cell, 1.5 * cell);
      g.fillRect(x + cell, y - 1.2 * cell - step, 4 * cell, 1.5 * cell);
    }
    const bodyY = top + head,
      armSwing = moving ? Math.sin(now / 65 + seed) * 1.5 * cell : 0;
    g.fillStyle = shirt;
    g.fillRect(x - bodyW / 2 - 3 * cell, bodyY + 2 * cell, 3 * cell, 7 * cell);
    g.fillRect(x + bodyW / 2, bodyY + 2 * cell, 3 * cell, 7 * cell);
    g.fillStyle = '#e0b39a';
    g.fillRect(x - bodyW / 2 - 3 * cell, bodyY + 8 * cell + armSwing, 3 * cell, 3 * cell);
    g.fillRect(x + bodyW / 2, bodyY + 8 * cell - armSwing, 3 * cell, 3 * cell);
    g.fillStyle = '#3a2d3b';
    g.fillRect(x - bodyW / 2 - cell, bodyY + cell, bodyW + 2 * cell, bodyH - cell);
    g.fillStyle = shirt;
    g.fillRect(x - bodyW / 2, bodyY + 2 * cell, bodyW, bodyH - 2 * cell);
    g.fillStyle = '#493642';
    g.fillRect(x - 4 * cell, bodyY, 8 * cell, 3 * cell);
    g.fillStyle = seed % 2 ? '#f2d39a' : '#eed5e5';
    g.fillRect(x - cell, bodyY + 5 * cell, 2 * cell, 2 * cell);
    if (seed % 6 === 0 && !sitting) {
      g.fillStyle = '#e8d2b0';
      g.fillRect(x + bodyW / 2 + 2 * cell, bodyY + 7 * cell, 4 * cell, 4 * cell);
    }
    const headY = top,
      widths = [4, 8, 10, 12, 12, 12, 12, 12, 10, 10, 8, 4];
    widths.forEach((units, row) => {
      g.fillStyle = row < 3 ? hairColor : row < 5 ? '#302638' : skin;
      g.fillRect(x - (units * cell) / 2, headY + row * cell, units * cell, cell);
      if (row >= 2 && row <= 8) {
        g.fillStyle = row % 2 ? '#ffffff15' : '#241d2c22';
        g.fillRect(x - (units * cell) / 2, headY + row * cell, cell, cell);
      }
    });
    g.fillStyle = '#201a22';
    g.fillRect(x - 3.3 * cell, headY + 6 * cell, 1.5 * cell, 1.5 * cell);
    g.fillRect(x + 1.8 * cell, headY + 6 * cell, 1.5 * cell, 1.5 * cell);
    g.fillStyle = '#f7dfba';
    g.fillRect(x - 3.1 * cell, headY + 6 * cell, cell, cell);
    g.fillRect(x + 2 * cell, headY + 6 * cell, cell, cell);
    const accessory = seed % 4;
    if (accessory < 2) {
      g.fillStyle = '#26212d';
      g.fillRect(x - 7 * cell, headY + 2 * cell, 2 * cell, 6 * cell);
      g.fillRect(x + 5 * cell, headY + 2 * cell, 2 * cell, 6 * cell);
      g.fillStyle = '#d3a968';
      g.fillRect(x - 8 * cell, headY + 4 * cell, 3 * cell, 4 * cell);
      g.fillRect(x + 5 * cell, headY + 4 * cell, 3 * cell, 4 * cell);
      g.fillStyle = '#332638';
      g.fillRect(x - 4 * cell, headY - cell, 8 * cell, cell);
      g.fillRect(x - 3 * cell, headY - 2 * cell, 6 * cell, cell);
    } else if (accessory === 2) {
      g.fillStyle = '#b37d87';
      g.fillRect(x - 5 * cell, headY, 10 * cell, 3 * cell);
      g.fillRect(x - 4 * cell, headY - cell, 8 * cell, cell);
    } else {
      g.fillStyle = '#8ca878';
      g.fillRect(x - cell, headY - 4 * cell, 2 * cell, 4 * cell);
      g.fillRect(x - 3 * cell, headY - 4 * cell, 2 * cell, 2 * cell);
      g.fillRect(x + cell, headY - 3 * cell, 2 * cell, 2 * cell);
    }
    g.font = '10px "DM Sans", sans-serif';
    g.textAlign = 'center';
    const label = guest.id === this.sessionId ? 'Bạn' : guest.name,
      labelWidth = Math.min(90, g.measureText(label).width + 12),
      labelX = x - labelWidth / 2,
      labelY = top - 16;
    g.fillStyle = guest.id === this.sessionId ? '#e4b879' : '#211b2bcc';
    g.fillRect(labelX, labelY, labelWidth, 13);
    g.fillStyle = guest.id === this.sessionId ? '#271e27' : '#f3e9df';
    g.fillText(label, x, labelY + 10);
  }

  private onMovement(movement: Movement): void {
    if (movement.id === this.sessionId) return;
    const guest = this.guests.get(movement.id);
    if (guest)
      Object.assign(guest, {
        tx: movement.x,
        ty: movement.y,
        face: movement.face,
        seat: null,
        walkingUntil: performance.now() + 220,
      });
  }

  private seatPosition(index: number): WorldPoint {
    const row = Math.floor(index / SEAT_COLUMNS.length),
      column = index % SEAT_COLUMNS.length,
      depth = SEAT_DEPTHS[row];
    const minX = Math.max(0.04, depth - 0.96),
      maxX = Math.min(0.96, depth - 0.04),
      x = minX + (maxX - minX) * SEAT_COLUMNS[column];
    return { x, y: depth - x };
  }

  private project(x: number, y: number, w: number, h: number): WorldPoint {
    return {
      x: w * 0.5 + (x - y) * w * 0.39,
      y: h * 0.27 + (x + y) * h * 0.24,
    };
  }

  private fillPolygon(g: CanvasRenderingContext2D, points: WorldPoint[], color: string): void {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath();
    g.fill();
  }

  private keyDirection(key: string): string | null {
    const keys: Record<string, string> = {
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
    };
    return keys[key] ?? null;
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement,
      rect = canvas.getBoundingClientRect(),
      dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
