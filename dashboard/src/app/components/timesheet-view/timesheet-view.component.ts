import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { AuthService } from '../../services/auth.service';
import { TimeEntry, WeekSummary } from '../../models';

@Component({
  selector: 'app-timesheet-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="flex justify-between items-center mb-2">
        <h2>My Timesheet</h2>
        <div class="flex gap-1 items-center">
          <button class="btn btn-outline" (click)="previousWeek()">&larr; Prev</button>
          <span class="week-label">{{ weekStart }}</span>
          <button class="btn btn-outline" (click)="nextWeek()">Next &rarr;</button>
        </div>
      </div>

      <div *ngIf="summary" class="summary-bar mb-2">
        <div class="summary-item">
          <span class="summary-label">Total Hours</span>
          <span class="summary-value">{{ summary.totalHours | number:'1.1-1' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Regular</span>
          <span class="summary-value">{{ summary.regularHours | number:'1.1-1' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Overtime</span>
          <span class="summary-value" [class.text-warning]="summary.overtimeHours > 0">{{ summary.overtimeHours | number:'1.1-1' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Entries</span>
          <span class="summary-value">{{ summary.entryCount }}</span>
        </div>
      </div>

      <table *ngIf="entries.length > 0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Project</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Break</th>
            <th>Hours</th>
            <th>GPS</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entry of entries">
            <td>{{ entry.clock_in | date:'EEE, MMM d' }}</td>
            <td>{{ entry.project_name || '-' }}</td>
            <td>{{ entry.clock_in | date:'shortTime' }}</td>
            <td>{{ entry.clock_out ? (entry.clock_out | date:'shortTime') : 'Active' }}</td>
            <td>{{ entry.break_minutes }}m</td>
            <td>{{ calcHours(entry) | number:'1.1-2' }}</td>
            <td>
              <span *ngIf="entry.gps_lat" class="gps-badge" [title]="entry.gps_lat + ', ' + entry.gps_lng">GPS</span>
              <span *ngIf="!entry.gps_lat" class="text-muted">-</span>
            </td>
            <td>
              <span class="badge" [ngClass]="'badge-' + entry.status">{{ entry.status }}</span>
            </td>
            <td>
              <button
                *ngIf="entry.status === 'draft' && entry.clock_out"
                class="btn btn-primary btn-sm"
                (click)="submitEntry(entry)"
                [disabled]="entry._submitting">
                Submit
              </button>
              <span *ngIf="entry.status === 'submitted'" class="text-muted" style="font-size:12px;">Pending</span>
              <span *ngIf="entry.status === 'approved'" class="text-success" style="font-size:12px;">Approved</span>
              <span *ngIf="entry.status === 'rejected'" class="text-danger" style="font-size:12px;">
                Rejected
                <button class="btn btn-outline btn-sm" (click)="submitEntry(entry)" style="margin-left:4px;">Resubmit</button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="entries.length === 0 && !loading" class="empty-state">
        <p class="text-muted">No time entries for this week.</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <p class="text-muted">Loading timesheet...</p>
      </div>
    </div>
  `,
  styles: [`
    .summary-bar {
      display: flex;
      gap: 24px;
      padding: 16px;
      background: #f0f4ff;
      border-radius: 8px;
    }
    .summary-item { text-align: center; }
    .summary-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .week-label {
      font-weight: 500;
      min-width: 120px;
      text-align: center;
    }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .gps-badge {
      background: #dcfce7;
      color: #15803d;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .empty-state, .loading-state {
      text-align: center;
      padding: 40px;
    }
  `]
})
export class TimesheetViewComponent implements OnInit {
  entries: (TimeEntry & { _submitting?: boolean })[] = [];
  summary: WeekSummary | null = null;
  weekStart = '';
  currentWeek = new Date();
  loading = false;

  constructor(
    private timesheetService: TimesheetService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setWeekStart();
    this.loadTimesheet();
  }

  setWeekStart(): void {
    const d = new Date(this.currentWeek);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    this.weekStart = d.toISOString().split('T')[0];
  }

  previousWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() - 7);
    this.setWeekStart();
    this.loadTimesheet();
  }

  nextWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() + 7);
    this.setWeekStart();
    this.loadTimesheet();
  }

  loadTimesheet(): void {
    const user = this.authService.currentUser;
    if (!user) return;
    this.loading = true;
    this.timesheetService.getTimesheet(user.id, this.weekStart).subscribe({
      next: (res) => {
        this.entries = res.entries;
        this.summary = res.summary;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  calcHours(entry: TimeEntry): number {
    if (!entry.clock_out) return 0;
    const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
    return Math.max(0, ms / 3600000 - (entry.break_minutes || 0) / 60);
  }

  submitEntry(entry: TimeEntry & { _submitting?: boolean }): void {
    entry._submitting = true;
    this.timesheetService.submitEntry(entry.id).subscribe({
      next: (res) => {
        entry.status = res.entry.status;
        entry._submitting = false;
      },
      error: () => {
        entry._submitting = false;
      }
    });
  }
}
