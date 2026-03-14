import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnomalyFlag } from '../models';

@Injectable({ providedIn: 'root' })
export class AnomalyService {
  private apiUrl = '/api/ai/anomalies';

  constructor(private http: HttpClient) {}

  detectAnomalies(employeeId: string, entries?: any[]): Observable<{ anomalies: AnomalyFlag[] }> {
    return this.http.post<{ anomalies: AnomalyFlag[] }>(this.apiUrl, {
      employee_id: employeeId,
      entries
    });
  }

  getAnomalies(employeeId: string): Observable<{ anomalies: AnomalyFlag[] }> {
    return this.http.get<{ anomalies: AnomalyFlag[] }>(`${this.apiUrl}/${employeeId}`);
  }
}
