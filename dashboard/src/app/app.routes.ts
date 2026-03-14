import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ClockWidgetComponent } from './components/clock-widget/clock-widget.component';
import { TimesheetViewComponent } from './components/timesheet-view/timesheet-view.component';
import { ManagerQueueComponent } from './components/manager-queue/manager-queue.component';
import { PayrollReportComponent } from './components/payroll-report/payroll-report.component';
import { AnomalyAlertsComponent } from './components/anomaly-alerts/anomaly-alerts.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', component: ClockWidgetComponent },
      { path: 'timesheet', component: TimesheetViewComponent },
      { path: 'approvals', component: ManagerQueueComponent },
      { path: 'payroll', component: PayrollReportComponent },
      { path: 'anomalies', component: AnomalyAlertsComponent }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
