import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimeEntry, WeekSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private apiUrl = '/api/timesheets';

  constructor(private http: HttpClient) {}

  getTimesheet(employeeId: string, week?: string): Observable<{ entries: TimeEntry[]; summary: WeekSummary }> {
    let params = new HttpParams();
    if (week) params = params.set('week', week);
    return this.http.get<{ entries: TimeEntry[]; summary: WeekSummary }>(`${this.apiUrl}/${employeeId}`, { params });
  }

  submitEntry(id: string): Observable<{ entry: TimeEntry }> {
    return this.http.post<{ entry: TimeEntry }>(`${this.apiUrl}/${id}/submit`, {});
  }

  approveEntry(id: string, notes?: string): Observable<{ entry: TimeEntry }> {
    return this.http.post<{ entry: TimeEntry }>(`${this.apiUrl}/${id}/approve`, { notes });
  }

  rejectEntry(id: string, reason: string): Observable<{ entry: TimeEntry }> {
    return this.http.post<{ entry: TimeEntry }>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  getPending(): Observable<{ entries: TimeEntry[] }> {
    return this.http.get<{ entries: TimeEntry[] }>(`${this.apiUrl}/pending`);
  }
}
