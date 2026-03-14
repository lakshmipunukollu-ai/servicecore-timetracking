# Story 5: Payroll Reports

## Description
Generate payroll reports with hours breakdown, overtime calculation, and gross pay.

## Acceptance Criteria
- GET /api/reports/payroll returns payroll summary for date range
- Regular hours: first 40 hours/week
- Overtime hours: above 40 hours/week at 1.5x rate
- Break minutes subtracted from total hours
- Shows per-employee breakdown
- Angular PayrollReportComponent with hours and pay breakdown
- Only managers/admins can access

## Tasks
1. Payroll calculation logic
2. Report generation endpoint
3. Employee summary endpoint
4. Angular PayrollReportComponent
5. Export/print-friendly layout
