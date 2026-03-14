import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnomalyService } from '../../services/anomaly.service';
import { AuthService } from '../../services/auth.service';
import { AnomalyFlag } from '../../models';

@Component({
  selector: 'app-anomaly-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="flex justify-between items-center mb-2">
        <h2>AI Anomaly Detection</h2>
        <div class="flex gap-1">
          <button
            *ngIf="authService.isManager"
            class="btn btn-primary"
            (click)="runDetection()"
            [disabled]="detecting">
            {{ detecting ? 'Analyzing...' : 'Run AI Analysis' }}
          </button>
          <button class="btn btn-outline" (click)="loadAnomalies()">Refresh</button>
        </div>
      </div>

      <div *ngIf="anomalies.length > 0" class="anomaly-list">
        <div *ngFor="let a of anomalies" class="anomaly-item" [ngClass]="'severity-' + a.severity">
          <div class="anomaly-icon">
            <span *ngIf="a.severity === 'error'" class="icon-error">!</span>
            <span *ngIf="a.severity === 'warning'" class="icon-warning">!</span>
            <span *ngIf="a.severity === 'info'" class="icon-info">i</span>
          </div>
          <div class="anomaly-content">
            <div class="anomaly-header">
              <span class="badge" [ngClass]="'badge-' + a.severity">{{ a.severity }}</span>
              <span class="anomaly-field">{{ a.field }}</span>
            </div>
            <p class="anomaly-reason">{{ a.reason }}</p>
            <p *ngIf="a.value" class="anomaly-value text-muted">Value: {{ a.value }}</p>
            <p class="anomaly-date text-muted">{{ a.created_at | date:'medium' }}</p>
          </div>
        </div>
      </div>

      <div *ngIf="anomalies.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">&#10003;</div>
        <p>No anomalies detected</p>
        <p class="text-muted" style="font-size:13px;">All time entries appear normal. AI analysis runs automatically or can be triggered manually.</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <p class="text-muted">Loading anomalies...</p>
      </div>

      <div *ngIf="error" class="error-msg mt-1">{{ error }}</div>
    </div>
  `,
  styles: [`
    .anomaly-list { display: flex; flex-direction: column; gap: 12px; }
    .anomaly-item {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .severity-error {
      background: #fef2f2;
      border-left-color: #dc2626;
    }
    .severity-warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .severity-info {
      background: #eff6ff;
      border-left-color: #2563eb;
    }
    .anomaly-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    .icon-error { background: #fecaca; color: #dc2626; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .icon-warning { background: #fef3c7; color: #92400e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .icon-info { background: #dbeafe; color: #1d4ed8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .anomaly-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .anomaly-field { font-weight: 600; font-size: 14px; }
    .anomaly-reason { font-size: 14px; margin-bottom: 4px; }
    .anomaly-value { font-size: 12px; }
    .anomaly-date { font-size: 11px; }
    .empty-state {
      text-align: center;
      padding: 40px;
    }
    .empty-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #dcfce7;
      color: #16a34a;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    .loading-state { text-align: center; padding: 40px; }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
  `]
})
export class AnomalyAlertsComponent implements OnInit {
  anomalies: AnomalyFlag[] = [];
  loading = false;
  detecting = false;
  error = '';

  constructor(
    private anomalyService: AnomalyService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAnomalies();
  }

  loadAnomalies(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    this.loading = true;
    this.anomalyService.getAnomalies(user.id).subscribe({
      next: (res) => {
        this.anomalies = res.anomalies;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  runDetection(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    this.detecting = true;
    this.error = '';
    this.anomalyService.detectAnomalies(user.id).subscribe({
      next: (res) => {
        this.anomalies = [...res.anomalies, ...this.anomalies];
        this.detecting = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Anomaly detection failed';
        this.detecting = false;
      }
    });
  }
}
