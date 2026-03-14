require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const clockRoutes = require('./routes/clock');
const timeEntryRoutes = require('./routes/timeEntries');
const timesheetRoutes = require('./routes/timesheets');
const projectRoutes = require('./routes/projects');
const reportRoutes = require('./routes/reports');
const anomalyRoutes = require('./routes/anomalies');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check - no auth required
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/clock', authMiddleware, clockRoutes);
app.use('/api/time-entries', authMiddleware, timeEntryRoutes);
app.use('/api/timesheets', authMiddleware, timesheetRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/ai/anomalies', authMiddleware, anomalyRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ServiceCore API running on port ${PORT}`);
  });
}

module.exports = app;
