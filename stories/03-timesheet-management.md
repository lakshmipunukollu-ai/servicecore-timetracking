# Story 3: Timesheet Management

## Description
Employees view and edit their weekly timesheets. Editable grid showing daily hours with project breakdown.

## Acceptance Criteria
- GET /api/time-entries returns entries for current user, filterable by date range
- PUT /api/time-entries/:id allows editing draft entries
- DELETE /api/time-entries/:id allows deleting draft entries
- GET /api/timesheets/:employeeId returns weekly summary
- Angular TimesheetViewComponent with editable weekly grid
- Shows hours per day, project, break minutes, notes
- Only draft entries can be edited

## Tasks
1. Time entry CRUD routes
2. Weekly aggregation queries
3. Angular TimesheetViewComponent
4. Inline editing in grid
5. Date range navigation (week picker)
