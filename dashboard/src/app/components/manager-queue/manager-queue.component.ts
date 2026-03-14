import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimeEntry } from '../../models';

@Component({
  selector: 'app-manager-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="flex justify-between items-center mb-2">
        <h2>Pending Approvals</h2>
        <button class="btn btn-outline" (click)="loadPending()">Refresh</button>
      </div>

      <table *ngIf="entries.length > 0">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Project</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
            <th>GPS</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entry of entries">
            <td>
              <strong>{{ entry.employee_name }}</strong>
              <br><span class="text-muted" style="font-size:12px;">{{ entry.employee_email }}</span>
            </td>
            <td>{{ entry.clock_in | date:'EEE, MMM d' }}</td>
            <td>{{ entry.project_name || '-' }}</td>
            <td>{{ entry.clock_in | date:'shortTime' }}</td>
            <td>{{ entry.clock_out | date:'shortTime' }}</td>
            <td>{{ calcHours(entry) | number:'1.1-2' }}</td>
            <td>
              <span *ngIf="entry.gps_lat" class="gps-badge" [title]="'Lat: ' + entry.gps_lat + ' Lng: ' + entry.gps_lng">
                {{ entry.gps_lat | number:'1.4-4' }}, {{ entry.gps_lng | number:'1.4-4' }}
              </span>
              <span *ngIf="!entry.gps_lat" class="text-muted">No GPS</span>
            </td>
            <td class="action-cell">
              <div *ngIf="!entry._showReject">
                <button class="btn btn-success btn-sm" (click)="approveEntry(entry)" [disabled]="entry._processing">
                  Approve
                </button>
                <button class="btn btn-danger btn-sm" (click)="entry._showReject = true" [disabled]="entry._processing" style="margin-left:4px;">
                  Reject
                </button>
              </div>
              <div *ngIf="entry._showReject" class="reject-form">
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="entry._rejectReason"
                  placeholder="Reason for rejection"
                  style="font-size:12px;padding:6px 8px;"
                />
                <div class="flex gap-1 mt-1">
                  <button class="btn btn-danger btn-sm" (click)="rejectEntry(entry)" [disabled]="entry._processing">
                    Confirm Reject
                  </button>
                  <button class="btn btn-outline btn-sm" (click)="entry._showReject = false">
                    Cancel
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="entries.length === 0 && !loading" class="empty-state">
        <p class="text-muted">No pending approvals. All caught up!</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <p class="text-muted">Loading pending approvals...</p>
      </div>
    </div>
  `,
  styles: [`
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .action-cell { min-width: 180px; }
    .reject-form { max-width: 250px; }
    .gps-badge {
      font-size: 11px;
      color: #15803d;
      background: #dcfce7;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .empty-state, .loading-state {
      text-align: center;
      padding: 40px;
    }
  `]
})
export class ManagerQueueComponent implements OnInit {
  entries: (TimeEntry & { _showReject?: boolean; _rejectReason?: string; _processing?: boolean })[] = [];
  loading = false;

  constructor(private timesheetService: TimesheetService) {}

  ngOnInit(): void {
    this.loadPending();
  }

  loadPending(): void {
    this.loading = true;
    this.timesheetService.getPending().subscribe({
      next: (res) => {
        this.entries = res.entries;
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

  approveEntry(entry: TimeEntry & { _processing?: boolean }): void {
    entry._processing = true;
    this.timesheetService.approveEntry(entry.id).subscribe({
      next: () => {
        this.entries = this.entries.filter(e => e.id !== entry.id);
      },
      error: () => {
        entry._processing = false;
      }
    });
  }

  rejectEntry(entry: TimeEntry & { _showReject?: boolean; _rejectReason?: string; _processing?: boolean }): void {
    entry._processing = true;
    this.timesheetService.rejectEntry(entry.id, entry._rejectReason || 'No reason provided').subscribe({
      next: () => {
        this.entries = this.entries.filter(e => e.id !== entry.id);
      },
      error: () => {
        entry._processing = false;
      }
    });
  }
}
