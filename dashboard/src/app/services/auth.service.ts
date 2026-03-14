import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Employee, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser$ = new BehaviorSubject<Employee | null>(null);
  private tokenKey = 'sc_token';
  private userKey = 'sc_user';
  private apiUrl = '/api/auth';

  user$ = this.currentUser$.asObservable();

  constructor(private http: HttpClient) {
    const stored = localStorage.getItem(this.userKey);
    if (stored) {
      try {
        this.currentUser$.next(JSON.parse(stored));
      } catch {
        this.logout();
      }
    }
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get currentUser(): Employee | null {
    return this.currentUser$.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get isManager(): boolean {
    const u = this.currentUser;
    return u?.role === 'manager' || u?.role === 'admin';
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem(this.userKey, JSON.stringify(res.employee));
        this.currentUser$.next(res.employee);
      })
    );
  }

  register(email: string, name: string, password: string, role?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, name, password, role }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem(this.userKey, JSON.stringify(res.employee));
        this.currentUser$.next(res.employee);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser$.next(null);
  }

  fetchMe(): Observable<{ employee: Employee }> {
    return this.http.get<{ employee: Employee }>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        localStorage.setItem(this.userKey, JSON.stringify(res.employee));
        this.currentUser$.next(res.employee);
      })
    );
  }
}
