import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { TaskApiService } from '../data-access/task-api.service';
import { TaskProgress } from '../models/task.model';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-modal.component.html',
  styleUrl: './task-modal.component.scss',
})
export class TaskModalComponent implements OnInit, OnDestroy {
  @Input() userId = '';
  @Input() token = '';
  @Output() closed = new EventEmitter<void>();
  @Output() progressChanged = new EventEmitter<TaskProgress>();

  private readonly api = inject(TaskApiService);
  readonly progress = signal<TaskProgress | null>(null);
  readonly loading = signal(true);
  readonly claiming = signal<string | null>(null);
  readonly error = signal('');
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    void this.load();
    this.refreshTimer = setInterval(() => void this.refreshQuietly(), 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const progress = await this.api.getProgress(this.userId, this.token);
      this.progress.set(progress);
      this.progressChanged.emit(progress);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Không tải được danh sách nhiệm vụ.');
    } finally {
      this.loading.set(false);
    }
  }

  async claim(taskId: string): Promise<void> {
    if (this.claiming()) return;
    this.claiming.set(taskId);
    this.error.set('');
    try {
      const progress = await this.api.claim(this.userId, this.token, taskId);
      this.progress.set(progress);
      this.progressChanged.emit(progress);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Chưa thể nhận EXP.');
    } finally {
      this.claiming.set(null);
    }
  }

  private async refreshQuietly(): Promise<void> {
    try {
      const progress = await this.api.getProgress(this.userId, this.token);
      this.progress.set(progress);
      this.progressChanged.emit(progress);
    } catch {
      // Giữ danh sách đang hiển thị; lần mở tiếp theo sẽ thử tải lại.
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closed.emit();
  }
}
