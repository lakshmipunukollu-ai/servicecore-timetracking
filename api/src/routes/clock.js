const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/clock/in
router.post('/in', async (req, res) => {
  try {
    const employeeId = req.user.sub;
    const { project_id, notes, gps_lat, gps_lng } = req.body;

    // Check for active entry
    const active = await pool.query(
      'SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL',
      [employeeId]
    );

    if (active.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in. Clock out first.' });
    }

    const result = await pool.query(
      `INSERT INTO time_entries (employee_id, project_id, clock_in, notes, gps_lat, gps_lng, status)
       VALUES ($1, $2, NOW(), $3, $4, $5, 'draft')
       RETURNING *`,
      [employeeId, project_id || null, notes || null, gps_lat || null, gps_lng || null]
    );

    res.status(201).json({ timeEntry: result.rows[0] });
  } catch (err) {
    console.error('Clock in error:', err);
    res.status(500).json({ error: 'Clock in failed' });
  }
});

// POST /api/clock/out
router.post('/out', async (req, res) => {
  try {
    const employeeId = req.user.sub;
    const { notes, break_minutes } = req.body;

    const active = await pool.query(
      'SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL',
      [employeeId]
    );

    if (active.rows.length === 0) {
      return res.status(400).json({ error: 'Not clocked in.' });
    }

    const updates = [];
    const params = [active.rows[0].id];
    let paramIdx = 2;

    let query = 'UPDATE time_entries SET clock_out = NOW()';

    if (notes !== undefined) {
      query += `, notes = $${paramIdx++}`;
      params.push(notes);
    }
    if (break_minutes !== undefined) {
      query += `, break_minutes = $${paramIdx++}`;
      params.push(break_minutes);
    }

    query += `, updated_at = NOW() WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, params);
    res.json({ timeEntry: result.rows[0] });
  } catch (err) {
    console.error('Clock out error:', err);
    res.status(500).json({ error: 'Clock out failed' });
  }
});

// GET /api/clock/status
router.get('/status', async (req, res) => {
  try {
    const employeeId = req.user.sub;

    const result = await pool.query(
      `SELECT te.*, p.name as project_name
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.employee_id = $1 AND te.clock_out IS NULL`,
      [employeeId]
    );

    res.json({ activeEntry: result.rows[0] || null });
  } catch (err) {
    console.error('Clock status error:', err);
    res.status(500).json({ error: 'Failed to get clock status' });
  }
});

module.exports = router;
