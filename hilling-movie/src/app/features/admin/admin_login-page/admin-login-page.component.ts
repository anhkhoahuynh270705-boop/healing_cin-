import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentApiService } from '../../payment/data-access/payment-api.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login-page.component.html',
  styleUrl: './admin-login-page.component.scss',
})
export class AdminLoginPageComponent implements OnInit {
  @Output() authenticated = new EventEmitter<boolean>();
  @Output() showRegister = new EventEmitter<void>();

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    key: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  busy = false;
  error = '';

  private readonly paymentApi = inject(PaymentApiService);

  ngOnInit(): void {
    try {
      if (localStorage.getItem('cinema_admin_token')) this.authenticated.emit(true);
    } catch {}
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
      const { username, password, key } = this.form.getRawValue();
      const response = await this.paymentApi.adminLogin(username.trim(), password, key);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Không đăng nhập được admin.');
      localStorage.setItem('cinema_admin_token', body.token);
      this.form.reset({ username: '', password: '', key: '' });
      this.authenticated.emit(true);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không đăng nhập được admin.';
    } finally {
      this.busy = false;
    }
  }
}
