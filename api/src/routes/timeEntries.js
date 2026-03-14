const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/time-entries
router.get('/', async (req, res) => {
  try {
    const employeeId = req.user.sub;
    const { start, end } = req.query;

    let query = `
      SELECT te.*, p.name as project_name
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.employee_id = $1
    `;
    const params = [employeeId];

    if (start) {
      params.push(start);
      query += ` AND te.clock_in >= $${params.length}::timestamptz`;
    }
    if (end) {
      params.push(end);
      query += ` AND te.clock_in <= $${params.length}::timestamptz`;
    }

    query += ' ORDER BY te.clock_in DESC';

    const result = await pool.query(query, params);
    res.json({ entries: result.rows });
  } catch (err) {
    console.error('Get entries error:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// GET /api/time-entries/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*, p.name as project_name
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Check ownership unless manager/admin
    if (result.rows[0].employee_id !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Get entry error:', err);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// PUT /api/time-entries/:id
router.put('/:id', async (req, res) => {
  try {
    // Check ownership and status
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = existing.rows[0];
    if (entry.employee_id !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'draft' && entry.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected entries can be edited' });
    }

    const { project_id, clock_in, clock_out, break_minutes, notes } = req.body;

    const result = await pool.query(
      `UPDATE time_entries SET
        project_id = COALESCE($2, project_id),
        clock_in = COALESCE($3, clock_in),
        clock_out = COALESCE($4, clock_out),
        break_minutes = COALESCE($5, break_minutes),
        notes = COALESCE($6, notes),
        status = 'draft',
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, project_id, clock_in, clock_out, break_minutes, notes]
    );

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Update entry error:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/time-entries/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = existing.rows[0];
    if (entry.employee_id !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (entry.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft entries can be deleted' });
    }

    await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete entry error:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
