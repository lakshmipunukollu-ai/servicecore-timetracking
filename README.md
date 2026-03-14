# ServiceCore Time Tracking

Employee time tracking and payroll dashboard for field service businesses. Features clock in/out, weekly timesheets, manager approval workflows, payroll reporting with overtime calculations, GPS validation, and AI-powered anomaly detection.

## Tech Stack

- **Backend:** Node.js + Express (JavaScript)
- **Frontend:** Angular 17 (standalone components)
- **Database:** PostgreSQL
- **Auth:** JWT with bcrypt password hashing
- **AI:** Claude API for timesheet anomaly detection

## Quick Start

```bash
# Install dependencies
make install

# Run database migrations
make migrate

# Seed demo data
make seed

# Start API server (port 3003)
make dev

# Run tests
make test

# Build frontend
make build
```

## Configuration

Copy `.env.example` to `.env` and configure:

```
PORT=3003
DATABASE_URL=postgresql://user:pass@localhost:5432/servicecore_timetracking
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key
NODE_ENV=development
```

## Demo Accounts

After running `make seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@servicecore.com | admin123 | Admin |
| manager@servicecore.com | manager123 | Manager |
| john@servicecore.com | employee123 | Employee |
| jane@servicecore.com | employee123 | Employee |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Clock In/Out
- `POST /api/clock/in` - Clock in with optional GPS and project
- `POST /api/clock/out` - Clock out with optional break minutes
- `GET /api/clock/status` - Check active clock entry

### Time Entries
- `GET /api/time-entries` - List entries (filterable by date)
- `PUT /api/time-entries/:id` - Edit draft entries
- `DELETE /api/time-entries/:id` - Delete draft entries

### Timesheets
- `GET /api/timesheets/:employeeId` - Weekly timesheet view
- `POST /api/timesheets/:id/submit` - Submit for approval
- `POST /api/timesheets/:id/approve` - Manager approve
- `POST /api/timesheets/:id/reject` - Manager reject
- `GET /api/timesheets/pending` - Pending approvals (manager)

### Reports
- `GET /api/reports/payroll` - Payroll report with overtime
- `GET /api/reports/employee/:id` - Individual employee report

### AI Anomalies
- `POST /api/ai/anomalies` - Run anomaly detection (manager)
- `GET /api/ai/anomalies/:employeeId` - View anomaly flags

## Frontend Pages

- **Login** - Authentication with demo account quick-fill
- **Clock In/Out** - GPS-enabled clock widget with project selector
- **Timesheet** - Weekly grid with submit actions and week navigation
- **Approvals** - Manager queue with approve/reject workflow
- **Payroll** - Date range reports with overtime calculations
- **Anomalies** - AI-flagged entries with severity indicators

## Overtime Calculation

- Regular hours: first 40 hours/week at hourly rate
- Overtime hours: above 40 hours/week at 1.5x rate (or custom overtime rate)
- Break minutes subtracted from total hours
