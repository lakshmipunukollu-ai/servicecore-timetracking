# Story 7: GPS Validation

## Description
Capture and validate GPS coordinates when employees clock in, ensuring they are at the job site.

## Acceptance Criteria
- GPS coordinates captured on clock in (optional, browser geolocation)
- Stored in time_entries as gps_lat, gps_lng
- Visible in timesheet view and manager queue
- Map display or coordinate display in UI
- GPS data included in reports

## Tasks
1. GPS fields in time_entries table
2. Browser geolocation API integration
3. GPS display in time entry details
4. Location validation display in manager queue
