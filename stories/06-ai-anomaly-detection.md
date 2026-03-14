# Story 6: AI Anomaly Detection

## Description
Use Claude API to detect unusual patterns in timesheet submissions. Flags anomalies for manager review.

## Acceptance Criteria
- POST /api/ai/anomalies analyzes time entries for anomalies
- Detects: unusual hours, missing breaks, unexpected overtime, off-hours work, data entry errors
- Returns anomaly flags with field, value, reason, severity
- GET /api/ai/anomalies/:employeeId returns stored flags
- Falls back gracefully if Claude API unavailable
- Angular AnomalyAlertsComponent showing flagged entries
- Severity levels: info, warning, error with visual indicators

## Tasks
1. Claude API integration with retry logic
2. Anomaly detection prompt engineering
3. Anomaly storage and retrieval
4. Angular AnomalyAlertsComponent
5. Dismiss/acknowledge anomaly actions
