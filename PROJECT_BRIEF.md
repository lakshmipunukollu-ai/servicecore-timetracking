# PROJECT BRIEF
# (Extracted from MASTER_PROJECT_PLAYBOOK.md — your section only)

## SENIOR ENGINEER DECISIONS — READ FIRST

Before any code is written, here are the opinionated decisions made across all 9 projects
and why. An agent should never second-guess these unless given new information.

### Stack choices made
| Project | Backend | Frontend | DB | Deploy | Rationale |
|---------|---------|---------|-----|--------|-----------|
| FSP Scheduler | TypeScript + Node.js | React + TypeScript | PostgreSQL (multi-tenant) | Azure Container Apps | TS chosen over C# — same Azure ecosystem, better AI library support, faster iteration |
| Replicated | Python + FastAPI | Next.js 14 | PostgreSQL + S3 | Docker | Python wins for LLM tooling; Next.js for real-time streaming UI |
| ServiceCore | Node.js + Express | Angular (required) | PostgreSQL | Railway | Angular required — clean REST API behind it |
| Zapier | Python + FastAPI | None (API only + optional React dashboard) | PostgreSQL + Redis | Railway | Redis for event queue durability; Python for DX-first API |
| ST6 | Java 21 + Spring Boot | TypeScript micro-frontend (React) | PostgreSQL | Docker | Java required — Spring Boot is the senior choice; React micro-frontend mounts into PA host |
| ZeroPath | Python + FastAPI | React + TypeScript | PostgreSQL | Render | Python for LLM scanning logic; React for triage dashboard |
| Medbridge | Python + FastAPI + LangGraph | None (webhook-driven) | PostgreSQL | Railway | LangGraph is the correct tool for state-machine AI agents |
| CompanyCam | Python + FastAPI | React + TypeScript | PostgreSQL | Render | Python for CV/ML inference; React for annotation UI |
| Upstream | Django + DRF | React + TypeScript | PostgreSQL | Render | Django for rapid e-commerce scaffolding; built-in admin is a bonus |

### The 4 shared modules — build these FIRST
These are the highest ROI pieces of work. Build them once, copy-scaffold into every project.

1. `shared/llm_client.py` — Claude API wrapper with retry, streaming, structured output parsing
2. `shared/auth/` — JWT auth + role-based guards (Python + TypeScript versions)
3. `shared/state_machine.py` — Generic FSM: states, transitions, guards, event log
4. `shared/queue/` — Job queue pattern: enqueue, dequeue, ack, retry (Redis + Postgres fallback)

### Build order (wave system)
**Wave 0 (Day 1):** Build shared modules. All other waves depend on these.
**Wave 1 (Days 2-3):** Zapier + ZeroPath — establish LLM pipeline + REST API patterns
**Wave 2 (Days 4-5):** Medbridge + Replicated — LLM pipeline variants, more complex AI
**Wave 3 (Days 6-8):** FSP + ST6 — complex business logic, approval flows
**Wave 4 (Days 9-11):** ServiceCore + Upstream + CompanyCam — isolated stacks, finish strong

---

## PROJECT 3: SERVICECORE — TIME TRACKING & PAYROLL DASHBOARD
**Company:** ServiceCore | **Stack:** Angular (required) + Node.js/Express + PostgreSQL

### Company mission to impress
ServiceCore builds software for field service businesses. Their customers are small business
owners who are not technical. The thing that will impress them: clarity of data, zero
ambiguity in the UI, and the "AI-accelerated" angle executed well. The AI here should be
subtle but genuinely useful — automated anomaly detection in timesheets, smart suggestions.

### Architecture
```
Railway
├── api (Node.js + Express + TypeScript)
│   ├── POST /auth/login
│   ├── POST /clock/in  /clock/out
│   ├── GET  /timesheets/:employeeId
│   ├── POST /timesheets/:id/submit
│   ├── POST /timesheets/:id/approve   — manager only
│   ├── GET  /reports/payroll          — payroll summary
│   └── POST /ai/anomalies             — AI: flag unusual entries
└── dashboard (Angular 17 + Standalone components)
    ├── ClockWidget                    — big clock in/out button, project selector
    ├── TimesheetView                  — editable grid of this week's hours
    ├── ManagerQueue                   — pending approval requests
    ├── PayrollReport                  — hours breakdown + gross pay
    └── AnomalyAlerts                  — AI-flagged unusual patterns
```

### The AI-accelerated angle — what earns the "AI-Accelerated" badge
```typescript
// This is what separates an "AI-accelerated" submission from a plain dashboard
// Use Claude API to detect anomalies in timesheet submissions

async function detectTimesheetAnomalies(
  submission: TimesheetSubmission,
  employeeHistory: TimeEntry[]
): Promise<AnomalyFlag[]> {
  const prompt = `You are reviewing a timesheet submission for anomalies.

Employee history (last 12 weeks): ${JSON.stringify(employeeHistory)}
Current submission: ${JSON.stringify(submission)}

Flag any of the following if present:
- Hours significantly above/below employee's normal pattern
- Missing lunch breaks on shifts over 6 hours
- Overtime on days with no prior overtime history  
- Clock-in/out times outside normal work hours
- Same project selected for unusually long consecutive days
- Any hours that appear to be data entry errors (e.g., 24-hour shifts)

Return JSON array of anomalies with: field, value, reason, severity (info/warning/error)`;

  const result = await claudeClient.complete(prompt);
  return JSON.parse(result);
}
```

### Database schema
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',  -- 'employee' | 'manager' | 'admin'
  hourly_rate DECIMAL(10,2),
  overtime_rate DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',  -- 'draft' | 'submitted' | 'approved' | 'rejected'
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  entries JSONB NOT NULL,   -- snapshot of all time entries for this period
  summary JSONB NOT NULL    -- totals per employee, overtime calc, gross pay
);
```

### Overtime calculation — get this exactly right
```typescript
function calculatePayroll(entries: TimeEntry[], employee: Employee): PayrollSummary {
  const regularHours = Math.min(totalHours(entries), 40);
  const overtimeHours = Math.max(totalHours(entries) - 40, 0);
  const regularPay = regularHours * employee.hourlyRate;
  const overtimePay = overtimeHours * (employee.overtimeRate ?? employee.hourlyRate * 1.5);
  
  return {
    employeeId: employee.id,
    name: employee.name,
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    grossPay: regularPay + overtimePay,
    entries: entries.map(e => ({
      date: e.clockIn,
      hours: calcHours(e),
      project: e.project?.name,
      status: e.status,
    })),
  };
}
```

### CLAUDE.md for ServiceCore agent
```
You are a senior Angular + Node.js engineer building an employee time tracking dashboard for ServiceCore.

COMPANY MISSION: Help field service businesses manage their workforce efficiently.
Their customers are NOT technical — the UI must be crystal clear, zero ambiguity.

THE AI ANGLE: Category is "AI-Accelerated." Use Claude API to detect timesheet anomalies.
This should feel like a smart assistant that catches mistakes, not a gimmick.

STACK: Angular 17 (standalone components), Node.js/Express, PostgreSQL, Railway
NEVER: Complex Angular module structure — use standalone components throughout
ALWAYS: Overtime at 1.5x after 40 hours/week, manager approval required before payroll
KEY FEATURE: The anomaly detection makes this stand out from every other submission
```

---


## SHARED MODULES — BUILD THESE IN WAVE 0

### shared/llm_client.py
```python
"""
Shared Claude API client. Used by: Replicated, ZeroPath, Medbridge, CompanyCam, FSP, Upstream.
Copy this file into each Python project that needs it.
"""
import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
import json

client = anthropic.Anthropic()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def complete(
    prompt: str,
    system: str = "",
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 4096,
    as_json: bool = False,
) -> str | dict:
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text
    if as_json:
        # Strip markdown fences if present
        clean = text.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(clean)
    return text

async def analyze_image(
    image_b64: str,
    prompt: str,
    system: str = "",
    model: str = "claude-sonnet-4-20250514",
) -> dict:
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    return json.loads(message.content[0].text)
```

### shared/auth.py (Python version)
```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY, algorithm=ALGORITHM
    )

def require_role(*roles: str):
    def dependency(token: str = Depends(oauth2_scheme)):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("role") not in roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    return dependency

# Usage: @router.get("/admin", dependencies=[Depends(require_role("admin", "manager"))])
```

### shared/state_machine.py
```python
from dataclasses import dataclass
from typing import Generic, TypeVar, Callable
from datetime import datetime

S = TypeVar('S')  # State type
E = TypeVar('E')  # Event type

@dataclass
class Transition(Generic[S, E]):
    from_state: S
    event: E
    to_state: S
    guard: Callable | None = None  # optional condition function

class StateMachine(Generic[S, E]):
    def __init__(self, initial: S, transitions: list[Transition]):
        self.state = initial
        self._transitions = {(t.from_state, t.event): t for t in transitions}
        self._log: list[dict] = []

    def transition(self, event: E, context: dict = None) -> S:
        key = (self.state, event)
        t = self._transitions.get(key)
        if not t:
            raise ValueError(f"Invalid transition: {self.state} + {event}")
        if t.guard and not t.guard(context or {}):
            raise ValueError(f"Guard failed: {self.state} + {event}")
        prev = self.state
        self.state = t.to_state
        self._log.append({"from": prev, "event": event, "to": self.state, "at": datetime.utcnow().isoformat()})
        return self.state

    @property
    def history(self) -> list[dict]:
        return self._log.copy()
```

---
