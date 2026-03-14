import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-layout">
      <nav class="sidebar">
        <div class="sidebar-header">
          <h2>ServiceCore</h2>
          <p class="text-muted" style="font-size:12px;">Time Tracking</p>
        </div>

        <div class="nav-links">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-link">
            <span class="nav-icon">&#9201;</span> Clock In/Out
          </a>
          <a routerLink="/dashboard/timesheet" routerLinkActive="active" class="nav-link">
            <span class="nav-icon">&#128197;</span> Timesheet
          </a>
          <a *ngIf="authService.isManager" routerLink="/dashboard/approvals" routerLinkActive="active" class="nav-link">
            <span class="nav-icon">&#9989;</span> Approvals
          </a>
          <a *ngIf="authService.isManager" routerLink="/dashboard/payroll" routerLinkActive="active" class="nav-link">
            <span class="nav-icon">&#128176;</span> Payroll
          </a>
          <a routerLink="/dashboard/anomalies" routerLinkActive="active" class="nav-link">
            <span class="nav-icon">&#9888;</span> Anomalies
          </a>
        </div>

        <div class="sidebar-footer">
          <div class="user-info">
            <strong>{{ authService.currentUser?.name }}</strong>
            <span class="badge badge-role">{{ authService.currentUser?.role }}</span>
          </div>
          <button class="btn btn-outline logout-btn" (click)="logout()">Sign Out</button>
        </div>
      </nav>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 240px;
      background: #1a1a2e;
      color: white;
      display: flex;
      flex-direction: column;
      padding: 24px 0;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
    }
    .sidebar-header {
      padding: 0 20px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .sidebar-header h2 {
      color: white;
      font-size: 20px;
    }
    .nav-links {
      flex: 1;
      padding: 16px 0;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
    }
    .nav-link:hover {
      color: white;
      background: rgba(255,255,255,0.05);
    }
    .nav-link.active {
      color: white;
      background: rgba(37,99,235,0.3);
      border-right: 3px solid #2563eb;
    }
    .nav-icon { font-size: 16px; }
    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .badge-role {
      background: rgba(37,99,235,0.3);
      color: #93bbfb;
      font-size: 11px;
    }
    .logout-btn {
      width: 100%;
      color: rgba(255,255,255,0.7);
      border-color: rgba(255,255,255,0.2);
      font-size: 13px;
    }
    .logout-btn:hover {
      color: white;
      border-color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.05);
    }
    .main-content {
      flex: 1;
      margin-left: 240px;
      padding: 32px;
      max-width: calc(100vw - 240px);
    }
  `]
})
export class DashboardComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
