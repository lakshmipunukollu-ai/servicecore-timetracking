import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<{ projects: Project[] }> {
    return this.http.get<{ projects: Project[] }>(this.apiUrl);
  }

  createProject(name: string, description?: string): Observable<{ project: Project }> {
    return this.http.post<{ project: Project }>(this.apiUrl, { name, description });
  }
}
