# Story 4: Approval Workflow

## Description
Employees submit timesheets for approval. Managers review and approve or reject.

## Acceptance Criteria
- POST /api/timesheets/:id/submit changes status from draft to submitted
- POST /api/timesheets/:id/approve changes status to approved (manager/admin only)
- POST /api/timesheets/:id/reject changes status to rejected with reason (manager/admin only)
- GET /api/timesheets/pending returns all submitted entries (manager/admin only)
- State machine: draft -> submitted -> approved/rejected
- Rejected entries go back to draft for re-editing
- Angular ManagerQueueComponent showing pending approvals
- Approve/reject buttons with optional notes

## Tasks
1. Submit/approve/reject routes with role guards
2. State transition validation
3. Angular ManagerQueueComponent
4. Approval action buttons with confirmation
5. Rejection reason input
