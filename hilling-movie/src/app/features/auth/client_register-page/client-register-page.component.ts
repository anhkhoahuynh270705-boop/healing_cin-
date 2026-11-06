import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthResponse } from '../models/user-profile.model';

@Component({
  selector: 'app-client-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-register-page.component.html',
  styleUrl: './client-register-page.component.scss',
})
export class ClientRegisterPageComponent {
  @Output() registered = new EventEmitter<AuthResponse>();

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    displayName: new FormControl('', { nonNullable: true }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  busy = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;

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
      this.error = 'Tên đăng nhập cần ít nhất 3 ký tự và mật khẩu ít nhất 4 ký tự.';
      return;
    }
    const { username, displayName, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.error = '';
    this.busy = true;
    try {
      const response = await this.authApi.register(
        username.trim(),
        password,
        displayName.trim() || username.trim(),
      );
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.message || 'Đăng ký không thành công.');
      }
      this.registered.emit(body as AuthResponse);
      this.form.reset({ username: '', displayName: '', password: '', confirmPassword: '' });
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ xác thực.';
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}
