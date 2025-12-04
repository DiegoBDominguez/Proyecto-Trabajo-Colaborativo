// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export type LoginResponse = {
  message?: string;
  access: string;
  refresh: string;
  user?: {
    id: number;
    username: string;
    email: string;
    rol?: 'admin' | 'agente' | 'usuario' | string;
    first_name?: string;
    last_name?: string;
  };
  // comodidad para el componente
  rol?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.url_api; // p.ej. http://127.0.0.1:8000/api/cuentas

  constructor(private http: HttpClient, private router: Router) {}

  /** Login -> guarda tokens, rol y user en localStorage */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login/`, { email, password })
      .pipe(
        map((res) => {
          const rol = res?.user?.rol ?? null;
          const normalized: LoginResponse = { ...res, rol };
          this.setSession(normalized);
          return normalized;
        })
      );
  }

  /** Logout y limpia TODO (tokens, rol, user) */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('rol');
    localStorage.removeItem('user');
    sessionStorage.clear();
    this.router.navigate(['/login-screen']);
  }

  /** Verifica si hay sesión activa (valida que al menos exista un token) */
  isLoggedIn(): boolean {
    const token = localStorage.getItem('access_token');
    const rol = localStorage.getItem('rol');
    // Ambos deben existir para considerar la sesión válida
    return !!(token && rol);
  }

  /** Rol actual (o null) */
  getRole(): 'admin' | 'agente' | 'usuario' | null {
    return (localStorage.getItem('rol') as any) || null;
  }

  /** Usuario actual (objeto completo) */
  getUser():
    | { id: number; username: string; email: string; rol?: string; first_name?: string; last_name?: string }
    | null {
    const raw = localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Guarda sesión después del login */
  private setSession(res: LoginResponse): void {
    if (res.access) localStorage.setItem('access_token', res.access);
    if (res.refresh) localStorage.setItem('refresh_token', res.refresh);
    if (res.rol) localStorage.setItem('rol', res.rol);
    if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
  }

  /** Valida el token con el backend (opcional, para seguridad adicional) */
  validateToken(): Observable<boolean> {
    const token = localStorage.getItem('access_token');
    if (!token) return new Observable(obs => obs.next(false));

    // Si tu backend tiene un endpoint para validar tokens, úsalo aquí
    // Por ahora, solo verificamos que exista
    return new Observable(obs => {
      obs.next(this.isLoggedIn());
      obs.complete();
    });
  }
}
