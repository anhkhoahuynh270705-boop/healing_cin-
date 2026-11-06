import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthResponse } from '../models/user-profile.model';

@Component({
  selector: 'app-client-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-login-page.component.html',
  styleUrl: './client-login-page.component.scss',
})
export class ClientLoginPageComponent {
  @Output() authenticated = new EventEmitter<AuthResponse>();
  @Output() guestLogin = new EventEmitter<void>();

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  busy = false;
  error = '';
  showPassword = false;

  private readonly authApi = inject(AuthApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    merge(this.form.valueChanges, this.form.statusChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cdr.markForCheck());
  }

  async submit(): Promise<void> {
    if (this.busy) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error = '';
    this.busy = true;
    try {
      const { username, password } = this.form.getRawValue();
      const response = await this.authApi.login(username.trim(), password);
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.message || 'Đăng nhập không thành công.');
      }
      this.authenticated.emit(body as AuthResponse);
      this.form.reset({ username: '', password: '' });
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ xác thực.';
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}
