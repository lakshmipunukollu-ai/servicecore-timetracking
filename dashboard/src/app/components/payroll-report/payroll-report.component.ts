import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';
import { PayrollReport } from '../../models';

@Component({
  selector: 'app-payroll-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="flex justify-between items-center mb-2">
        <h2>Payroll Report</h2>
        <div class="flex gap-1 items-center">
          <div class="form-group" style="margin:0;">
            <label style="font-size:12px;">Start Date</label>
            <input type="date" class="form-control" [(ngModel)]="startDate" style="font-size:13px;padding:6px 10px;" />
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:12px;">End Date</label>
            <input type="date" class="form-control" [(ngModel)]="endDate" style="font-size:13px;padding:6px 10px;" />
          </div>
          <button class="btn btn-primary" (click)="generateReport()" [disabled]="loading" style="align-self:flex-end;">
            {{ loading ? 'Generating...' : 'Generate' }}
          </button>
        </div>
      </div>

      <div *ngIf="report" class="report-content">
        <div class="totals-bar mb-2">
          <div class="total-item">
            <span class="total-label">Total Regular Hours</span>
            <span class="total-value">{{ report.totals.totalRegularHours | number:'1.1-1' }}</span>
          </div>
          <div class="total-item">
            <span class="total-label">Total Overtime Hours</span>
            <span class="total-value text-warning">{{ report.totals.totalOvertimeHours | number:'1.1-1' }}</span>
          </div>
          <div class="total-item">
            <span class="total-label">Total Gross Pay</span>
            <span class="total-value text-success">\${{ report.totals.totalGrossPay | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="employee-section" *ngFor="let emp of report.employees">
          <div class="employee-header">
            <div>
              <strong>{{ emp.name }}</strong>
              <span class="text-muted" style="margin-left:8px;font-size:13px;">{{ emp.email }}</span>
            </div>
            <div class="employee-pay">
              <span class="pay-amount">\${{ emp.grossPay | number:'1.2-2' }}</span>
            </div>
          </div>
          <div class="employee-details">
            <span>Regular: {{ emp.regularHours | number:'1.1-1' }}h (\${{ emp.regularPay | number:'1.2-2' }})</span>
            <span *ngIf="emp.overtimeHours > 0" class="text-warning">
              | OT: {{ emp.overtimeHours | number:'1.1-1' }}h (\${{ emp.overtimePay | number:'1.2-2' }})
            </span>
          </div>
          <table class="sub-table" *ngIf="emp.entries.length > 0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Project</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of emp.entries">
                <td>{{ e.date | date:'EEE, MMM d' }}</td>
                <td>{{ e.hours | number:'1.1-2' }}</td>
                <td>{{ e.project || '-' }}</td>
                <td><span class="badge" [ngClass]="'badge-' + e.status">{{ e.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="report.employees.length === 0" class="empty-state">
          <p class="text-muted">No payroll data for the selected period.</p>
        </div>
      </div>

      <div *ngIf="!report && !loading" class="empty-state">
        <p class="text-muted">Select a date range and click Generate to view the payroll report.</p>
      </div>

      <div *ngIf="error" class="error-msg mt-1">{{ error }}</div>
    </div>
  `,
  styles: [`
    .totals-bar {
      display: flex;
      gap: 24px;
      padding: 16px;
      background: #f0f9ff;
      border-radius: 8px;
    }
    .total-item { text-align: center; flex: 1; }
    .total-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
    }
    .employee-section {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .employee-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .pay-amount {
      font-size: 20px;
      font-weight: 700;
      color: #16a34a;
    }
    .employee-details {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .sub-table { font-size: 13px; }
    .sub-table th { font-size: 11px; }
    .empty-state { text-align: center; padding: 40px; }
    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
  `]
})
export class PayrollReportComponent implements OnInit {
  startDate = '';
  endDate = '';
  report: PayrollReport | null = null;
  loading = false;
  error = '';

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    // Default to current week
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    this.startDate = monday.toISOString().split('T')[0];
    this.endDate = sunday.toISOString().split('T')[0];
  }

  generateReport(): void {
    if (!this.startDate || !this.endDate) {
      this.error = 'Please select both start and end dates';
      return;
    }
    this.loading = true;
    this.error = '';
    this.reportService.getPayrollReport(this.startDate, this.endDate).subscribe({
      next: (res) => {
        this.report = res.report;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to generate report';
        this.loading = false;
      }
    });
  }
}
