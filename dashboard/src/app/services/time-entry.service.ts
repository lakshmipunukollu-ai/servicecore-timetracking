import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimeEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class TimeEntryService {
  private apiUrl = '/api/time-entries';
  private clockUrl = '/api/clock';

  constructor(private http: HttpClient) {}

  getEntries(start?: string, end?: string): Observable<{ entries: TimeEntry[] }> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<{ entries: TimeEntry[] }>(this.apiUrl, { params });
  }

  getEntry(id: string): Observable<{ entry: TimeEntry }> {
    return this.http.get<{ entry: TimeEntry }>(`${this.apiUrl}/${id}`);
  }

  updateEntry(id: string, data: Partial<TimeEntry>): Observable<{ entry: TimeEntry }> {
    return this.http.put<{ entry: TimeEntry }>(`${this.apiUrl}/${id}`, data);
  }

  deleteEntry(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  clockIn(data: { project_id?: string; notes?: string; gps_lat?: number; gps_lng?: number }): Observable<{ timeEntry: TimeEntry }> {
    return this.http.post<{ timeEntry: TimeEntry }>(`${this.clockUrl}/in`, data);
  }

  clockOut(data: { notes?: string; break_minutes?: number }): Observable<{ timeEntry: TimeEntry }> {
    return this.http.post<{ timeEntry: TimeEntry }>(`${this.clockUrl}/out`, data);
  }

  getClockStatus(): Observable<{ activeEntry: TimeEntry | null }> {
    return this.http.get<{ activeEntry: TimeEntry | null }>(`${this.clockUrl}/status`);
  }
}
