import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card card">
        <div class="login-header">
          <h1>ServiceCore</h1>
          <p class="text-muted">Time Tracking Dashboard</p>
        </div>

        <form (ngSubmit)="onLogin()" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              class="form-control"
              [(ngModel)]="email"
              name="email"
              placeholder="Enter your email"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              class="form-control"
              [(ngModel)]="password"
              name="password"
              placeholder="Enter your password"
              required
            />
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-lg login-btn" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="demo-accounts mt-3">
          <p class="text-muted" style="font-size:13px;margin-bottom:8px;">Demo accounts:</p>
          <div class="demo-list">
            <button class="btn btn-outline demo-btn" (click)="fillDemo('admin@servicecore.com','admin123')">Admin</button>
            <button class="btn btn-outline demo-btn" (click)="fillDemo('manager@servicecore.com','manager123')">Manager</button>
            <button class="btn btn-outline demo-btn" (click)="fillDemo('john@servicecore.com','employee123')">Employee</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 40px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .login-header h1 {
      font-size: 32px;
      color: #2563eb;
      margin-bottom: 4px;
    }
    .login-btn {
      width: 100%;
      margin-top: 8px;
    }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .demo-list {
      display: flex;
      gap: 8px;
    }
    .demo-btn {
      flex: 1;
      font-size: 12px;
      padding: 6px 10px;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  fillDemo(email: string, password: string): void {
    this.email = email;
    this.password = password;
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.error = 'Email and password are required';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Login failed. Please try again.';
      }
    });
  }
}
