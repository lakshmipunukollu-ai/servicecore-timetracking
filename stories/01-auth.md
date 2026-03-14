# Story 1: Authentication & User Management

## Description
Implement JWT-based authentication with role-based access control for employees, managers, and admins.

## Acceptance Criteria
- POST /api/auth/register creates a new employee with hashed password
- POST /api/auth/login returns JWT token on valid credentials
- GET /api/auth/me returns current user info from token
- Passwords hashed with bcrypt
- JWT expires in 24 hours
- Roles: employee, manager, admin
- Auth middleware protects all /api/* routes except auth endpoints
- Angular login page with form validation

## Tasks
1. Create auth routes and controllers
2. Implement JWT middleware
3. Role-based guards (manager, admin)
4. Angular LoginComponent with AuthService
5. Token storage and auto-attach to requests
