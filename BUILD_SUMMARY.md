# Build Summary - ServiceCore Time Tracking

## Project Overview
Employee time tracking and payroll dashboard for field service businesses. Built with Angular 17 frontend and Node.js/Express backend with PostgreSQL database.

## What Was Built

### Backend (Node.js + Express)
- JWT authentication with bcrypt password hashing and role-based access control
- Clock in/out API with GPS coordinate capture
- Time entry CRUD with ownership and status validation
- Timesheet submission and manager approval workflow (draft -> submitted -> approved/rejected)
- Payroll report generation with overtime calculations (40h regular, 1.5x overtime)
- AI anomaly detection using Claude API with rule-based fallback
- Project management endpoints

### Frontend (Angular 17)
- **LoginComponent** - Authentication form with demo account quick-fill buttons
- **ClockWidgetComponent** - Real-time elapsed timer, GPS capture, project selector, break minutes input
- **TimesheetViewComponent** - Weekly grid with date navigation, hours calculation, submit actions, status badges
- **ManagerQueueComponent** - Pending approval list with approve/reject workflow and rejection reason input
- **PayrollReportComponent** - Date range selection, per-employee breakdown with overtime calculation
- **AnomalyAlertsComponent** - Severity-colored anomaly display with AI analysis trigger
- **DashboardComponent** - Sidebar navigation with role-based menu items

### Services
- AuthService, TimeEntryService, TimesheetService, ReportService, AnomalyService, ProjectService
- JWT auth interceptor for automatic token attachment

### Tests
- 56 backend API tests covering all routes
- Mocked PostgreSQL pool for isolated testing
- Tests for auth, clock, time entries, timesheets, projects, reports, anomalies
- Verifies role-based access control and overtime calculations

## Port Configuration
- API: 3003
- Frontend: 5003 (dev server)
- Database: servicecore_timetracking

## Commands
- `make install` - Install all dependencies
- `make dev` - Start API server
- `make test` - Run test suite (56 tests, 0 failures)
- `make seed` - Migrate and seed demo data
- `make build` - Build frontend for production

## AI Integration
- Claude API for intelligent timesheet anomaly detection
- Rule-based fallback when API is unavailable
- Detects: unusual hours, missing breaks, off-hours work, data entry errors
- Results stored in anomaly_flags table for review
