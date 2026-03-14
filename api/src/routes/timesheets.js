const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/timesheets/pending - manager/admin only
router.get('/pending', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*, e.name as employee_name, e.email as employee_email, p.name as project_name
       FROM time_entries te
       JOIN employees e ON te.employee_id = e.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.status = 'submitted'
       ORDER BY te.clock_in DESC`
    );

    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Get pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending timesheets' });
  }
});

// GET /api/timesheets/:employeeId
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { week } = req.query;

    // Check access
    if (employeeId !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let startDate, endDate;
    if (week) {
      startDate = new Date(week);
    } else {
      startDate = new Date();
    }
    // Get Monday of the week
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(startDate.setDate(diff));
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const result = await pool.query(
      `SELECT te.*, p.name as project_name
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.employee_id = $1
         AND te.clock_in >= $2
         AND te.clock_in < $3
       ORDER BY te.clock_in ASC`,
      [employeeId, startDate.toISOString(), endDate.toISOString()]
    );

    // Calculate summary
    let totalHours = 0;
    result.rows.forEach(entry => {
      if (entry.clock_out) {
        const hours = (new Date(entry.clock_out) - new Date(entry.clock_in)) / 3600000;
        totalHours += hours - (entry.break_minutes || 0) / 60;
      }
    });

    res.json({
      entries: result.rows,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: Math.min(totalHours, 40),
        overtimeHours: Math.max(totalHours - 40, 0),
        entryCount: result.rows.length,
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('Get timesheet error:', err);
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

// POST /api/timesheets/:id/submit
router.post('/:id/submit', async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = existing.rows[0];
    if (entry.employee_id !== req.user.sub) {
      return res.status(403).json({ error: 'Can only submit your own entries' });
    }

    if (entry.status !== 'draft' && entry.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected entries can be submitted' });
    }

    if (!entry.clock_out) {
      return res.status(400).json({ error: 'Cannot submit entry without clock out time' });
    }

    const result = await pool.query(
      `UPDATE time_entries SET status = 'submitted', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit entry' });
  }
});

// POST /api/timesheets/:id/approve
router.post('/:id/approve', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (existing.rows[0].status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted entries can be approved' });
    }

    const result = await pool.query(
      `UPDATE time_entries SET
        status = 'approved',
        approved_by = $2,
        approved_at = NOW(),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, req.user.sub]
    );

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve entry' });
  }
});

// POST /api/timesheets/:id/reject
router.post('/:id/reject', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (existing.rows[0].status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted entries can be rejected' });
    }

    const result = await pool.query(
      `UPDATE time_entries SET
        status = 'rejected',
        notes = COALESCE(notes, '') || ' [Rejected: ' || $2 || ']',
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, reason || 'No reason provided']
    );

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Failed to reject entry' });
  }
});

module.exports = router;
