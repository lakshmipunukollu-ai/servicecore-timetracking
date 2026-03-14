const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock pg before requiring app
const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
jest.mock('pg', () => {
  const mockPool = {
    query: (...args) => mockQuery(...args),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

const app = require('../src/index');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ===================== Health Check =====================
describe('Health Check', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ===================== Auth Routes =====================
describe('Auth Routes', () => {
  test('POST /api/auth/login returns 400 without credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/auth/login returns 400 with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login returns 401 for invalid credentials', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login returns token for valid credentials', async () => {
    const hash = await bcrypt.hash('password123', 10);
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        password_hash: hash,
        role: 'employee',
        hourly_rate: '25.00'
      }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.employee).toBeDefined();
    expect(res.body.employee.email).toBe('test@test.com');
    expect(res.body.employee.password_hash).toBeUndefined();
  });

  test('POST /api/auth/register returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/register returns 409 for duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', name: 'Test', password: 'pass123' });
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register creates a new user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check existing
      .mockResolvedValueOnce({
        rows: [{
          id: 'new-user',
          email: 'new@test.com',
          name: 'New User',
          role: 'employee',
          hourly_rate: '25.00',
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      }); // insert

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', name: 'New User', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.employee.email).toBe('new@test.com');
  });

  test('GET /api/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns user info with valid token', async () => {
    const token = makeToken({ id: 'user-1', email: 'test@test.com', role: 'employee', name: 'Test' });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'employee',
        hourly_rate: '25.00',
        overtime_rate: null,
        created_at: new Date().toISOString()
      }],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.employee).toBeDefined();
  });
});

// ===================== Protected Routes (Auth required) =====================
describe('Protected Routes - No Token', () => {
  test('GET /api/clock/status returns 401 without token', async () => {
    const res = await request(app).get('/api/clock/status');
    expect(res.status).toBe(401);
  });

  test('GET /api/time-entries returns 401 without token', async () => {
    const res = await request(app).get('/api/time-entries');
    expect(res.status).toBe(401);
  });

  test('GET /api/projects returns 401 without token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('GET /api/timesheets/pending returns 401 without token', async () => {
    const res = await request(app).get('/api/timesheets/pending');
    expect(res.status).toBe(401);
  });

  test('GET /api/reports/payroll returns 401 without token', async () => {
    const res = await request(app).get('/api/reports/payroll?start=2024-01-01&end=2024-01-07');
    expect(res.status).toBe(401);
  });
});

// ===================== Clock Routes =====================
describe('Clock Routes', () => {
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });

  test('POST /api/clock/in creates a new time entry', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no active entry
      .mockResolvedValueOnce({
        rows: [{
          id: 'entry-1',
          employee_id: 'emp-1',
          clock_in: new Date().toISOString(),
          status: 'draft'
        }],
        rowCount: 1
      });

    const res = await request(app)
      .post('/api/clock/in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ notes: 'Starting work' });
    expect(res.status).toBe(201);
    expect(res.body.timeEntry).toBeDefined();
  });

  test('POST /api/clock/in fails if already clocked in', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'active-1' }], rowCount: 1 });

    const res = await request(app)
      .post('/api/clock/in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Already clocked in');
  });

  test('POST /api/clock/in with GPS coordinates', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{
          id: 'entry-2',
          employee_id: 'emp-1',
          gps_lat: 40.7128,
          gps_lng: -74.0060,
          clock_in: new Date().toISOString(),
          status: 'draft'
        }],
        rowCount: 1
      });

    const res = await request(app)
      .post('/api/clock/in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ gps_lat: 40.7128, gps_lng: -74.0060 });
    expect(res.status).toBe(201);
    expect(res.body.timeEntry.gps_lat).toBe(40.7128);
  });

  test('POST /api/clock/out closes active entry', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'entry-1' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: 'entry-1',
          employee_id: 'emp-1',
          clock_in: new Date(Date.now() - 3600000).toISOString(),
          clock_out: new Date().toISOString(),
          break_minutes: 30,
          status: 'draft'
        }],
        rowCount: 1
      });

    const res = await request(app)
      .post('/api/clock/out')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ break_minutes: 30 });
    expect(res.status).toBe(200);
    expect(res.body.timeEntry.clock_out).toBeDefined();
  });

  test('POST /api/clock/out fails if not clocked in', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/clock/out')
      .set('Authorization', `Bearer ${empToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Not clocked in');
  });

  test('GET /api/clock/status returns active entry', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'entry-1',
        employee_id: 'emp-1',
        clock_in: new Date().toISOString(),
        clock_out: null,
        project_name: 'Test Project'
      }],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/clock/status')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.activeEntry).toBeDefined();
    expect(res.body.activeEntry.id).toBe('entry-1');
  });

  test('GET /api/clock/status returns null when not clocked in', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/clock/status')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.activeEntry).toBeNull();
  });
});

// ===================== Time Entry Routes =====================
describe('Time Entry Routes', () => {
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });

  test('GET /api/time-entries returns entries for current user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'e1', employee_id: 'emp-1', clock_in: '2024-01-01T08:00:00Z', clock_out: '2024-01-01T16:00:00Z', status: 'draft' },
        { id: 'e2', employee_id: 'emp-1', clock_in: '2024-01-02T08:00:00Z', clock_out: '2024-01-02T16:30:00Z', status: 'draft' }
      ],
      rowCount: 2
    });

    const res = await request(app)
      .get('/api/time-entries')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  test('GET /api/time-entries with date range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/time-entries?start=2024-01-01&end=2024-01-07')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toBeDefined();
  });

  test('PUT /api/time-entries/:id updates draft entry', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', employee_id: 'emp-1', status: 'draft' }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', employee_id: 'emp-1', break_minutes: 45, status: 'draft' }],
        rowCount: 1
      });

    const res = await request(app)
      .put('/api/time-entries/e1')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ break_minutes: 45 });
    expect(res.status).toBe(200);
    expect(res.body.entry).toBeDefined();
  });

  test('PUT /api/time-entries/:id rejects editing submitted entries', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'emp-1', status: 'submitted' }],
      rowCount: 1
    });

    const res = await request(app)
      .put('/api/time-entries/e1')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ break_minutes: 45 });
    expect(res.status).toBe(400);
  });

  test('PUT /api/time-entries/:id rejects access from other users', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'other-emp', status: 'draft' }],
      rowCount: 1
    });

    const res = await request(app)
      .put('/api/time-entries/e1')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ break_minutes: 45 });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/time-entries/:id deletes draft entry', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', employee_id: 'emp-1', status: 'draft' }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete('/api/time-entries/e1')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/time-entries/:id rejects deleting non-draft entries', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'emp-1', status: 'approved' }],
      rowCount: 1
    });

    const res = await request(app)
      .delete('/api/time-entries/e1')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(400);
  });
});

// ===================== Timesheet Routes =====================
describe('Timesheet Routes', () => {
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });
  const mgrToken = makeToken({ id: 'mgr-1', email: 'mgr@test.com', role: 'manager', name: 'Manager' });

  test('GET /api/timesheets/:employeeId returns weekly timesheet', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'e1', employee_id: 'emp-1', clock_in: '2024-01-01T08:00:00Z', clock_out: '2024-01-01T16:00:00Z', break_minutes: 30 }
      ],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/timesheets/emp-1')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalHours).toBeDefined();
  });

  test('GET /api/timesheets/:employeeId denies access to other users entries', async () => {
    const res = await request(app)
      .get('/api/timesheets/other-emp')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/timesheets/:employeeId allows managers to view any employee', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/timesheets/emp-1')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(200);
  });

  test('POST /api/timesheets/:id/submit changes status to submitted', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'emp-1', status: 'draft', clock_out: '2024-01-01T16:00:00Z' }],
      rowCount: 1
    }).mockResolvedValueOnce({
      rows: [{ id: 'e1', status: 'submitted' }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/timesheets/e1/submit')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entry.status).toBe('submitted');
  });

  test('POST /api/timesheets/:id/submit fails without clock_out', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'emp-1', status: 'draft', clock_out: null }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/timesheets/e1/submit')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(400);
  });

  test('POST /api/timesheets/:id/submit fails for non-owner', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', employee_id: 'other-emp', status: 'draft', clock_out: '2024-01-01T16:00:00Z' }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/timesheets/e1/submit')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/timesheets/pending returns submitted entries for managers', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'e1', employee_id: 'emp-1', employee_name: 'Employee', status: 'submitted' }
      ],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/timesheets/pending')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
  });

  test('GET /api/timesheets/pending denied for employees', async () => {
    const res = await request(app)
      .get('/api/timesheets/pending')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/timesheets/:id/approve works for managers', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', status: 'submitted' }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', status: 'approved', approved_by: 'mgr-1' }],
        rowCount: 1
      });

    const res = await request(app)
      .post('/api/timesheets/e1/approve')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entry.status).toBe('approved');
  });

  test('POST /api/timesheets/:id/approve denied for employees', async () => {
    const res = await request(app)
      .post('/api/timesheets/e1/approve')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/timesheets/:id/reject works for managers with reason', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', status: 'submitted' }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'e1', status: 'rejected' }],
        rowCount: 1
      });

    const res = await request(app)
      .post('/api/timesheets/e1/reject')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ reason: 'Hours seem incorrect' });
    expect(res.status).toBe(200);
    expect(res.body.entry.status).toBe('rejected');
  });

  test('POST /api/timesheets/:id/approve rejects non-submitted entries', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1', status: 'draft' }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/timesheets/e1/approve')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(400);
  });
});

// ===================== Project Routes =====================
describe('Project Routes', () => {
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });
  const adminToken = makeToken({ id: 'adm-1', email: 'adm@test.com', role: 'admin', name: 'Admin' });

  test('GET /api/projects returns active projects', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'p1', name: 'Project A', active: true },
        { id: 'p2', name: 'Project B', active: true }
      ],
      rowCount: 2
    });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
  });

  test('POST /api/projects creates project for admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'p3', name: 'New Project', active: true }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Project', description: 'Description' });
    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('New Project');
  });

  test('POST /api/projects denied for employees', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ name: 'New Project' });
    expect(res.status).toBe(403);
  });

  test('POST /api/projects returns 400 without name', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ===================== Report Routes =====================
describe('Report Routes', () => {
  const mgrToken = makeToken({ id: 'mgr-1', email: 'mgr@test.com', role: 'manager', name: 'Manager' });
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });

  test('GET /api/reports/payroll returns payroll report for managers', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'e1', employee_id: 'emp-1', employee_name: 'John',
          employee_email: 'john@test.com', hourly_rate: '25.00',
          overtime_rate: null, clock_in: '2024-01-01T08:00:00Z',
          clock_out: '2024-01-01T16:30:00Z', break_minutes: 30,
          project_name: 'Project A', status: 'approved'
        }
      ],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/reports/payroll?start=2024-01-01&end=2024-01-07')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.employees).toBeDefined();
    expect(res.body.report.totals).toBeDefined();
  });

  test('GET /api/reports/payroll returns 400 without dates', async () => {
    const res = await request(app)
      .get('/api/reports/payroll')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/reports/payroll denied for employees', async () => {
    const res = await request(app)
      .get('/api/reports/payroll?start=2024-01-01&end=2024-01-07')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/reports/employee/:id returns employee summary', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'e1', clock_in: '2024-01-01T08:00:00Z',
          clock_out: '2024-01-01T16:30:00Z', break_minutes: 30,
          project_name: 'Project A'
        }
      ],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/reports/employee/emp-1')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalHours).toBeDefined();
  });

  test('GET /api/reports/employee/:id denies access to other employee reports', async () => {
    const res = await request(app)
      .get('/api/reports/employee/other-emp')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('Payroll report calculates overtime correctly', async () => {
    // Simulate an employee with 45 hours total (5 overtime)
    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push({
        id: `e${i}`, employee_id: 'emp-1', employee_name: 'John',
        employee_email: 'john@test.com', hourly_rate: '25.00',
        overtime_rate: '37.50',
        clock_in: `2024-01-0${i + 1}T07:00:00Z`,
        clock_out: `2024-01-0${i + 1}T16:00:00Z`,
        break_minutes: 0,
        project_name: 'Project A', status: 'approved'
      });
    }

    mockQuery.mockResolvedValueOnce({ rows: entries, rowCount: 5 });

    const res = await request(app)
      .get('/api/reports/payroll?start=2024-01-01&end=2024-01-07')
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(200);
    const emp = res.body.report.employees[0];
    expect(emp.regularHours).toBe(40);
    expect(emp.overtimeHours).toBe(5);
    expect(emp.regularPay).toBe(1000); // 40 * 25
    expect(emp.overtimePay).toBe(187.5); // 5 * 37.50
    expect(emp.grossPay).toBe(1187.5);
  });
});

// ===================== Anomaly Routes =====================
describe('Anomaly Routes', () => {
  const mgrToken = makeToken({ id: 'mgr-1', email: 'mgr@test.com', role: 'manager', name: 'Manager' });
  const empToken = makeToken({ id: 'emp-1', email: 'emp@test.com', role: 'employee', name: 'Employee' });

  test('GET /api/ai/anomalies/:employeeId returns anomalies', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'a1', employee_id: 'emp-1', field: 'hours',
          value: '14.5', reason: 'Unusually long shift', severity: 'warning',
          dismissed: false, created_at: new Date().toISOString()
        }
      ],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/ai/anomalies/emp-1')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.anomalies).toHaveLength(1);
    expect(res.body.anomalies[0].severity).toBe('warning');
  });

  test('GET /api/ai/anomalies/:employeeId denies access to other employees', async () => {
    const res = await request(app)
      .get('/api/ai/anomalies/other-emp')
      .set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/ai/anomalies denied for employees', async () => {
    const res = await request(app)
      .post('/api/ai/anomalies')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ employee_id: 'emp-1' });
    expect(res.status).toBe(403);
  });

  test('POST /api/ai/anomalies requires employee_id', async () => {
    const res = await request(app)
      .post('/api/ai/anomalies')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/ai/anomalies detects anomalies with rule-based detection', async () => {
    const now = new Date();
    // History
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'h1', clock_in: new Date(now - 8 * 3600000).toISOString(),
          clock_out: now.toISOString(), break_minutes: 30
        }
      ],
      rowCount: 1
    });
    // For each anomaly stored - mock multiple inserts
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/ai/anomalies')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        employee_id: 'emp-1',
        entries: [
          {
            id: 'e1',
            clock_in: '2024-01-01T07:00:00Z',
            clock_out: '2024-01-01T22:00:00Z',
            break_minutes: 0
          }
        ]
      });
    expect(res.status).toBe(200);
    expect(res.body.anomalies).toBeDefined();
    // Should detect long shift and missing break
    expect(res.body.anomalies.length).toBeGreaterThan(0);
  });
});
