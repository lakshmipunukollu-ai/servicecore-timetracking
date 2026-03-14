export interface Employee {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'manager' | 'admin';
  hourly_rate: number;
  overtime_rate?: number;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  project_id?: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  notes?: string;
  gps_lat?: number;
  gps_lng?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  project_name?: string;
  employee_name?: string;
  employee_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface AnomalyFlag {
  id: string;
  time_entry_id?: string;
  employee_id: string;
  field: string;
  value?: string;
  reason: string;
  severity: 'info' | 'warning' | 'error';
  dismissed: boolean;
  created_at: string;
}

export interface PayrollEmployee {
  employeeId: string;
  name: string;
  email: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  entries: {
    id: string;
    date: string;
    hours: number;
    project?: string;
    status: string;
  }[];
}

export interface PayrollReport {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  employees: PayrollEmployee[];
  totals: {
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalGrossPay: number;
  };
}

export interface WeekSummary {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entryCount: number;
  weekStart: string;
  weekEnd: string;
}

export interface AuthResponse {
  token: string;
  employee: Employee;
}
