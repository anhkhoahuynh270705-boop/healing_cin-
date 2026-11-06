import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentApiService } from '../../payment/data-access/payment-api.service';

@Component({
  selector: 'app-admin-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-register-page.component.html',
  styleUrl: './admin-register-page.component.scss',
})
export class AdminRegisterPageComponent {
  @Output() registered = new EventEmitter<void>();
  @Output() showLogin = new EventEmitter<void>();

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(32)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    key: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  busy = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;
  showAdminKey = false;

  private readonly paymentApi = inject(PaymentApiService);
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
      this.error = 'Vui lòng nhập tên hợp lệ và mật khẩu có ít nhất 8 ký tự.';
      return;
    }
    const { username, password, confirmPassword, key } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp.';
      return;
    }
    this.error = '';
    this.busy = true;
    try {
      const response = await this.paymentApi.adminRegister(username.trim(), password, key);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Không đăng ký được tài khoản admin.');
      this.form.reset({ username: '', password: '', confirmPassword: '', key: '' });
      this.registered.emit();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không đăng ký được tài khoản admin.';
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}
