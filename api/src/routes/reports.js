const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function calculateHours(clockIn, clockOut, breakMinutes) {
  if (!clockOut) return 0;
  const ms = new Date(clockOut) - new Date(clockIn);
  const hours = ms / 3600000;
  return Math.max(0, hours - (breakMinutes || 0) / 60);
}

// GET /api/reports/payroll
router.get('/payroll', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const result = await pool.query(
      `SELECT te.*, e.name as employee_name, e.email as employee_email,
              e.hourly_rate, e.overtime_rate, p.name as project_name
       FROM time_entries te
       JOIN employees e ON te.employee_id = e.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.clock_in >= $1::date
         AND te.clock_in < ($2::date + interval '1 day')
         AND te.clock_out IS NOT NULL
       ORDER BY e.name, te.clock_in`,
      [start, end]
    );

    // Group by employee and calculate payroll
    const byEmployee = {};
    result.rows.forEach(entry => {
      if (!byEmployee[entry.employee_id]) {
        byEmployee[entry.employee_id] = {
          employeeId: entry.employee_id,
          name: entry.employee_name,
          email: entry.employee_email,
          hourlyRate: parseFloat(entry.hourly_rate),
          overtimeRate: entry.overtime_rate ? parseFloat(entry.overtime_rate) : parseFloat(entry.hourly_rate) * 1.5,
          entries: [],
          totalHours: 0
        };
      }

      const hours = calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
      byEmployee[entry.employee_id].totalHours += hours;
      byEmployee[entry.employee_id].entries.push({
        id: entry.id,
        date: entry.clock_in,
        hours: Math.round(hours * 100) / 100,
        project: entry.project_name,
        status: entry.status
      });
    });

    const summary = Object.values(byEmployee).map(emp => {
      const regularHours = Math.min(emp.totalHours, 40);
      const overtimeHours = Math.max(emp.totalHours - 40, 0);
      const regularPay = regularHours * emp.hourlyRate;
      const overtimePay = overtimeHours * emp.overtimeRate;

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        grossPay: Math.round((regularPay + overtimePay) * 100) / 100,
        entries: emp.entries
      };
    });

    res.json({
      report: {
        periodStart: start,
        periodEnd: end,
        generatedAt: new Date().toISOString(),
        employees: summary,
        totals: {
          totalRegularHours: summary.reduce((s, e) => s + e.regularHours, 0),
          totalOvertimeHours: summary.reduce((s, e) => s + e.overtimeHours, 0),
          totalGrossPay: summary.reduce((s, e) => s + e.grossPay, 0)
        }
      }
    });
  } catch (err) {
    console.error('Payroll report error:', err);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
});

// GET /api/reports/employee/:id
router.get('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (id !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT te.*, p.name as project_name
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.employee_id = $1 AND te.clock_out IS NOT NULL
    `;
    const params = [id];

    if (start) {
      params.push(start);
      query += ` AND te.clock_in >= $${params.length}::date`;
    }
    if (end) {
      params.push(end);
      query += ` AND te.clock_in < ($${params.length}::date + interval '1 day')`;
    }

    query += ' ORDER BY te.clock_in DESC';

    const result = await pool.query(query, params);

    let totalHours = 0;
    const entries = result.rows.map(entry => {
      const hours = calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
      totalHours += hours;
      return {
        ...entry,
        hours: Math.round(hours * 100) / 100
      };
    });

    res.json({
      summary: {
        employeeId: id,
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: Math.round(Math.min(totalHours, 40) * 100) / 100,
        overtimeHours: Math.round(Math.max(totalHours - 40, 0) * 100) / 100,
        entryCount: entries.length,
        entries
      }
    });
  } catch (err) {
    console.error('Employee report error:', err);
    res.status(500).json({ error: 'Failed to generate employee report' });
  }
});

module.exports = router;
