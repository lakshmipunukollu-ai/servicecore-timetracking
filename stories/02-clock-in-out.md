# Story 2: Clock In/Out

## Description
Employees can clock in and out with a large, clear button. Supports project selection and GPS capture.

## Acceptance Criteria
- POST /api/clock/in starts a new time entry with clock_in timestamp
- POST /api/clock/out closes the active time entry with clock_out timestamp
- GET /api/clock/status returns current active entry or null
- Only one active (un-clocked-out) entry per employee at a time
- Optional GPS coordinates captured on clock in
- Optional project selection on clock in
- Angular ClockWidgetComponent with large clock button
- Shows current status (clocked in/out) and duration

## Tasks
1. Clock routes and controller
2. Active entry validation logic
3. Angular ClockWidgetComponent
4. GPS capture integration in UI
5. Project selector dropdown
