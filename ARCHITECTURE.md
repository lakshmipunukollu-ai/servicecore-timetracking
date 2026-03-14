# ServiceCore Time Tracking — Architecture Document

## Overview

ServiceCore Time Tracking is an employee time tracking and payroll dashboard for field service businesses. It provides clock in/out functionality, timesheet management, manager approval workflows, payroll reporting, and AI-powered anomaly detection.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | Angular 17 (standalone components) |
| Database | PostgreSQL |
| Auth | JWT (bcrypt password hashing) |
| AI | Claude API for timesheet anomaly detection |
| Deploy | Railway |

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Railway                        │
│                                                  │
│  ┌──────────────────┐   ┌────────────────────┐  │
│  │  Angular 17 SPA  │──▶│  Express API       │  │
│  │  (Port 4200)     │   │  (Port 3000)       │  │
│  └──────────────────┘   └────────┬───────────┘  │
│                                  │               │
│                         ┌────────▼───────────┐  │
│                         │   PostgreSQL       │  │
│                         │   (Port 5432)      │  │
│                         └────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Database Schema

### employees
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',  -- 'employee' | 'manager' | 'admin'
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 25.00,
  overtime_rate DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### time_entries
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  notes TEXT,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  status TEXT DEFAULT 'draft',  -- 'draft' | 'submitted' | 'approved' | 'rejected'
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### payroll_reports
```sql
CREATE TABLE payroll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  entries JSONB NOT NULL,
  summary JSONB NOT NULL
);
```

### anomaly_flags
```sql
CREATE TABLE anomaly_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  field TEXT NOT NULL,
  value TEXT,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',  -- 'info' | 'warning' | 'error'
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Contracts

### Authentication
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/auth/register | `{email, name, password, role?}` | `{token, employee}` | No |
| POST | /api/auth/login | `{email, password}` | `{token, employee}` | No |
| GET | /api/auth/me | — | `{employee}` | JWT |

### Health
| Method | Endpoint | Response | Auth |
|--------|----------|----------|------|
| GET | /health | `{status: "ok", timestamp}` | No |

### Clock In/Out
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/clock/in | `{project_id, notes?, gps_lat?, gps_lng?}` | `{timeEntry}` | JWT |
| POST | /api/clock/out | `{notes?, break_minutes?}` | `{timeEntry}` | JWT |
| GET | /api/clock/status | — | `{activeEntry}` or `{activeEntry: null}` | JWT |

### Time Entries
| Method | Endpoint | Body/Query | Response | Auth |
|--------|----------|------------|----------|------|
| GET | /api/time-entries | `?start=DATE&end=DATE` | `{entries[]}` | JWT |
| GET | /api/time-entries/:id | — | `{entry}` | JWT |
| PUT | /api/time-entries/:id | `{project_id?, clock_in?, clock_out?, break_minutes?, notes?}` | `{entry}` | JWT |
| DELETE | /api/time-entries/:id | — | `{success: true}` | JWT |

### Timesheets (submission/approval)
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| GET | /api/timesheets/:employeeId | `?week=YYYY-MM-DD` | `{entries[], summary}` | JWT |
| POST | /api/timesheets/:id/submit | — | `{entry}` | JWT (owner) |
| POST | /api/timesheets/:id/approve | `{notes?}` | `{entry}` | JWT (manager/admin) |
| POST | /api/timesheets/:id/reject | `{reason}` | `{entry}` | JWT (manager/admin) |
| GET | /api/timesheets/pending | — | `{entries[]}` | JWT (manager/admin) |

### Projects
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| GET | /api/projects | — | `{projects[]}` | JWT |
| POST | /api/projects | `{name, description?}` | `{project}` | JWT (admin) |

### Reports
| Method | Endpoint | Query | Response | Auth |
|--------|----------|-------|----------|------|
| GET | /api/reports/payroll | `?start=DATE&end=DATE` | `{report}` | JWT (manager/admin) |
| GET | /api/reports/employee/:id | `?start=DATE&end=DATE` | `{summary}` | JWT |

### AI Anomalies
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/ai/anomalies | `{employee_id, entries[]}` | `{anomalies[]}` | JWT (manager/admin) |
| GET | /api/ai/anomalies/:employeeId | — | `{anomalies[]}` | JWT |

## Overtime Calculation

- Regular hours: first 40 hours/week at `hourly_rate`
- Overtime hours: hours above 40/week at `overtime_rate` (defaults to `hourly_rate * 1.5`)
- Break minutes are subtracted from total hours
- Formula: `hours = (clock_out - clock_in) / 3600000 - break_minutes / 60`

## Authentication & Authorization

- JWT tokens with 24-hour expiry
- Roles: `employee`, `manager`, `admin`
- Employees can only view/edit their own entries
- Managers can approve/reject entries and view all team entries
- Admins have full access

## Angular Frontend Architecture

All components use Angular 17 standalone components (no NgModules).

### Pages/Components
1. **LoginComponent** — Login form
2. **ClockWidgetComponent** — Large clock in/out button with project selector
3. **TimesheetViewComponent** — Editable weekly grid of hours
4. **ManagerQueueComponent** — Pending approval requests (manager/admin only)
5. **PayrollReportComponent** — Hours breakdown with gross pay calculation
6. **AnomalyAlertsComponent** — AI-flagged unusual patterns
7. **DashboardComponent** — Main layout with navigation

### Services
- `AuthService` — Login, register, token management
- `TimeEntryService` — CRUD for time entries, clock in/out
- `TimesheetService` — Submit/approve/reject
- `ReportService` — Payroll reports
- `AnomalyService` — AI anomaly detection
- `ProjectService` — Project listing

## Environment Variables (.env)

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/servicecore
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key
NODE_ENV=development
```

## Design Decisions & Deviations

1. **Added `password_hash` to employees table** — The brief schema omitted it but auth requires it.
2. **Added `projects` table** — Referenced by time_entries but not defined in brief. Required for project selection.
3. **Added `anomaly_flags` table** — To persist AI-detected anomalies for review.
4. **Added GPS fields to time_entries** — For GPS validation feature mentioned in requirements.
5. **Added `gps_lat/gps_lng` to time_entries** — Brief mentions GPS validation; stored per entry.
6. **Standalone Angular components throughout** — As specified in CLAUDE.md guidance.
