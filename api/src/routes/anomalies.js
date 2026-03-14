const express = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/ai/anomalies - detect anomalies using AI
router.post('/', requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { employee_id, entries } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id is required' });
    }

    // Get employee history (last 12 weeks)
    const historyResult = await pool.query(
      `SELECT te.*, p.name as project_name
       FROM time_entries te
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE te.employee_id = $1
         AND te.clock_out IS NOT NULL
         AND te.clock_in >= NOW() - interval '12 weeks'
       ORDER BY te.clock_in DESC`,
      [employee_id]
    );

    const history = historyResult.rows;
    const currentEntries = entries || history.slice(0, 7); // Use provided or last week

    // Perform rule-based anomaly detection (fallback when Claude API not available)
    const anomalies = detectAnomaliesRuleBased(currentEntries, history);

    // Try AI-based detection if ANTHROPIC_API_KEY is set
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-key') {
      try {
        const aiAnomalies = await detectAnomaliesAI(currentEntries, history);
        anomalies.push(...aiAnomalies);
      } catch (aiErr) {
        console.warn('AI anomaly detection failed, using rule-based only:', aiErr.message);
      }
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      await pool.query(
        `INSERT INTO anomaly_flags (employee_id, time_entry_id, field, value, reason, severity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [employee_id, anomaly.time_entry_id || null, anomaly.field, anomaly.value, anomaly.reason, anomaly.severity]
      );
    }

    res.json({ anomalies });
  } catch (err) {
    console.error('Anomaly detection error:', err);
    res.status(500).json({ error: 'Anomaly detection failed' });
  }
});

// GET /api/ai/anomalies/:employeeId
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (employeeId !== req.user.sub && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT * FROM anomaly_flags
       WHERE employee_id = $1 AND dismissed = false
       ORDER BY created_at DESC`,
      [employeeId]
    );

    res.json({ anomalies: result.rows });
  } catch (err) {
    console.error('Get anomalies error:', err);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Rule-based anomaly detection
function detectAnomaliesRuleBased(currentEntries, history) {
  const anomalies = [];

  // Calculate average hours from history
  const historicalHours = history
    .filter(e => e.clock_out)
    .map(e => {
      const ms = new Date(e.clock_out) - new Date(e.clock_in);
      return ms / 3600000 - (e.break_minutes || 0) / 60;
    });

  const avgHours = historicalHours.length > 0
    ? historicalHours.reduce((a, b) => a + b, 0) / historicalHours.length
    : 8;

  for (const entry of currentEntries) {
    if (!entry.clock_out) continue;

    const hours = (new Date(entry.clock_out) - new Date(entry.clock_in)) / 3600000 - (entry.break_minutes || 0) / 60;

    // Flag entries significantly above average
    if (hours > avgHours * 1.5) {
      anomalies.push({
        time_entry_id: entry.id,
        field: 'hours',
        value: hours.toFixed(2),
        reason: `Hours (${hours.toFixed(1)}) significantly above average (${avgHours.toFixed(1)})`,
        severity: 'warning'
      });
    }

    // Flag very long shifts (>12 hours)
    if (hours > 12) {
      anomalies.push({
        time_entry_id: entry.id,
        field: 'hours',
        value: hours.toFixed(2),
        reason: `Unusually long shift: ${hours.toFixed(1)} hours`,
        severity: 'error'
      });
    }

    // Flag missing lunch break on long shifts
    if (hours > 6 && (!entry.break_minutes || entry.break_minutes === 0)) {
      anomalies.push({
        time_entry_id: entry.id,
        field: 'break_minutes',
        value: '0',
        reason: `No break recorded on ${hours.toFixed(1)}-hour shift (breaks required after 6 hours)`,
        severity: 'warning'
      });
    }

    // Flag very early or very late clock-ins
    const clockInHour = new Date(entry.clock_in).getHours();
    if (clockInHour < 5 || clockInHour > 20) {
      anomalies.push({
        time_entry_id: entry.id,
        field: 'clock_in',
        value: entry.clock_in,
        reason: `Unusual clock-in time: ${clockInHour}:00 (outside normal 5AM-8PM range)`,
        severity: 'info'
      });
    }
  }

  return anomalies;
}

// AI-based anomaly detection using Claude
async function detectAnomaliesAI(currentEntries, history) {
  const https = require('https');

  const prompt = `You are reviewing timesheet entries for anomalies.

Employee history (last 12 weeks): ${JSON.stringify(history.slice(0, 50))}
Current entries to review: ${JSON.stringify(currentEntries)}

Flag any of the following if present:
- Hours significantly above/below employee's normal pattern
- Missing lunch breaks on shifts over 6 hours
- Overtime on days with no prior overtime history
- Clock-in/out times outside normal work hours
- Same project selected for unusually long consecutive days
- Any hours that appear to be data entry errors (e.g., 24-hour shifts)

Return ONLY a JSON array of anomalies. Each anomaly object should have: field, value, reason, severity (info/warning/error).
If no anomalies found, return an empty array [].`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          const text = response.content?.[0]?.text || '[]';
          let clean = text.trim();
          if (clean.startsWith('```')) {
            clean = clean.split('\n').slice(1).join('\n').replace(/```$/, '').trim();
          }
          resolve(JSON.parse(clean));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(15000, () => { req.destroy(); resolve([]); });
    req.write(data);
    req.end();
  });
}

module.exports = router;
