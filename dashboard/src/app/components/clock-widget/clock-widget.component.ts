import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeEntryService } from '../../services/time-entry.service';
import { ProjectService } from '../../services/project.service';
import { TimeEntry, Project } from '../../models';

@Component({
  selector: 'app-clock-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card clock-card">
      <h2>Clock In / Out</h2>

      <div class="clock-status mt-2">
        <div *ngIf="activeEntry" class="status-active">
          <div class="status-indicator active"></div>
          <div>
            <strong>Clocked In</strong>
            <p class="text-muted">Since {{ activeEntry.clock_in | date:'shortTime' }}
              <span *ngIf="activeEntry.project_name"> - {{ activeEntry.project_name }}</span>
            </p>
            <p class="elapsed-time">{{ elapsedTime }}</p>
          </div>
        </div>
        <div *ngIf="!activeEntry && !loading" class="status-inactive">
          <div class="status-indicator inactive"></div>
          <span>Not clocked in</span>
        </div>
      </div>

      <!-- Clock In Form -->
      <div *ngIf="!activeEntry && !loading" class="clock-form mt-2">
        <div class="form-group">
          <label>Project</label>
          <select class="form-control" [(ngModel)]="selectedProject">
            <option value="">-- Select Project --</option>
            <option *ngFor="let p of projects" [value]="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <input type="text" class="form-control" [(ngModel)]="notes" placeholder="Add notes..." />
        </div>
        <div class="gps-info" *ngIf="gpsLat !== null">
          <span class="text-muted" style="font-size:12px;">GPS: {{ gpsLat | number:'1.4-4' }}, {{ gpsLng | number:'1.4-4' }}</span>
        </div>
        <button class="btn btn-success btn-lg clock-btn" (click)="clockIn()" [disabled]="submitting">
          {{ submitting ? 'Clocking In...' : 'Clock In' }}
        </button>
      </div>

      <!-- Clock Out Form -->
      <div *ngIf="activeEntry" class="clock-form mt-2">
        <div class="form-group">
          <label>Break Minutes</label>
          <input type="number" class="form-control" [(ngModel)]="breakMinutes" min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <input type="text" class="form-control" [(ngModel)]="outNotes" placeholder="Add notes..." />
        </div>
        <button class="btn btn-danger btn-lg clock-btn" (click)="clockOut()" [disabled]="submitting">
          {{ submitting ? 'Clocking Out...' : 'Clock Out' }}
        </button>
      </div>

      <div *ngIf="error" class="error-msg mt-1">{{ error }}</div>
    </div>
  `,
  styles: [`
    .clock-card { text-align: center; }
    .clock-btn { width: 100%; margin-top: 8px; }
    .status-active, .status-inactive {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .status-indicator.active {
      background: #16a34a;
      box-shadow: 0 0 8px rgba(22,163,74,0.5);
      animation: pulse 2s infinite;
    }
    .status-indicator.inactive { background: #9ca3af; }
    .elapsed-time {
      font-size: 28px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 4px;
    }
    .gps-info { margin-bottom: 8px; }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
    .clock-form { text-align: left; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class ClockWidgetComponent implements OnInit, OnDestroy {
  activeEntry: TimeEntry | null = null;
  projects: Project[] = [];
  selectedProject = '';
  notes = '';
  outNotes = '';
  breakMinutes = 0;
  gpsLat: number | null = null;
  gpsLng: number | null = null;
  error = '';
  loading = true;
  submitting = false;
  elapsedTime = '00:00:00';
  private timer: any;

  constructor(
    private timeEntryService: TimeEntryService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadStatus();
    this.loadProjects();
    this.captureGPS();
    this.timer = setInterval(() => this.updateElapsed(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  loadStatus(): void {
    this.loading = true;
    this.timeEntryService.getClockStatus().subscribe({
      next: (res) => {
        this.activeEntry = res.activeEntry;
        this.loading = false;
        this.updateElapsed();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => { this.projects = res.projects; },
      error: () => {}
    });
  }

  captureGPS(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.gpsLat = pos.coords.latitude;
          this.gpsLng = pos.coords.longitude;
        },
        () => {} // GPS not available, that's fine
      );
    }
  }

  clockIn(): void {
    this.submitting = true;
    this.error = '';
    const data: any = {};
    if (this.selectedProject) data.project_id = this.selectedProject;
    if (this.notes) data.notes = this.notes;
    if (this.gpsLat !== null) {
      data.gps_lat = this.gpsLat;
      data.gps_lng = this.gpsLng;
    }
    this.timeEntryService.clockIn(data).subscribe({
      next: (res) => {
        this.activeEntry = res.timeEntry;
        this.submitting = false;
        this.notes = '';
        this.selectedProject = '';
      },
      error: (err) => {
        this.error = err.error?.error || 'Clock in failed';
        this.submitting = false;
      }
    });
  }

  clockOut(): void {
    this.submitting = true;
    this.error = '';
    const data: any = {};
    if (this.breakMinutes) data.break_minutes = this.breakMinutes;
    if (this.outNotes) data.notes = this.outNotes;
    this.timeEntryService.clockOut(data).subscribe({
      next: () => {
        this.activeEntry = null;
        this.submitting = false;
        this.breakMinutes = 0;
        this.outNotes = '';
      },
      error: (err) => {
        this.error = err.error?.error || 'Clock out failed';
        this.submitting = false;
      }
    });
  }

  updateElapsed(): void {
    if (!this.activeEntry) {
      this.elapsedTime = '00:00:00';
      return;
    }
    const start = new Date(this.activeEntry.clock_in).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    this.elapsedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
