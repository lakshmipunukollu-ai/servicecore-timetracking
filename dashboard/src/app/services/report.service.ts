import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PayrollReport } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = '/api/reports';

  constructor(private http: HttpClient) {}

  getPayrollReport(start: string, end: string): Observable<{ report: PayrollReport }> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<{ report: PayrollReport }>(`${this.apiUrl}/payroll`, { params });
  }

  getEmployeeReport(employeeId: string, start?: string, end?: string): Observable<{ summary: any }> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<{ summary: any }>(`${this.apiUrl}/employee/${employeeId}`, { params });
  }
}
