// src/app/guards/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent,
  HttpErrorResponse, HttpClient
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.url;

    // Rutas públicas: NO enviar Authorization
    const isPublic =
      url.includes('/login') ||
      url.includes('/register') ||
      url.includes('/token/'); // refresh/verify/etc.

    const token = localStorage.getItem('access_token');
    const authReq = (!isPublic && token)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // Si no es 401 o es endpoint público, propaga el error
        if (isPublic || err.status !== 401) {
          return throwError(() => err);
        }

        // Si es 401 y el backend dice token inválido, intenta refresh
        const code = (err.error && (err.error.code || err.error.detail)) || '';
        const isTokenInvalid = typeof code === 'string' && code.toString().includes('token_not_valid');

        if (!isTokenInvalid) {
          return throwError(() => err);
        }

        return this.handle401AndRefresh(authReq, next);
      })
    );
  }

  private handle401AndRefresh(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null); // bloquea encolados
      const refresh = localStorage.getItem('refresh_token');

      if (!refresh) {
        // no hay refresh -> forzar logout si quieres
        return throwError(() => new Error('No refresh token'));
      }

      // pide nuevo access
      return this.http.post<{ access: string }>(`${environment.url_api}/token/refresh/`, { refresh }).pipe(
        switchMap(res => {
          const newAccess = res.access;
          localStorage.setItem('access_token', newAccess);
          this.isRefreshing = false;
          this.refreshSubject.next(newAccess);
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newAccess}` } });
          return next.handle(retried);
        }),
        catchError(e => {
          this.isRefreshing = false;
          this.refreshSubject.next(null);
          // opcional: limpiar storage y redirigir a login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          return throwError(() => e);
        })
      );
    } else {
      // Ya hay un refresh en curso: espera a que emita el nuevo token
      return this.refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token as string}` } });
          return next.handle(retried);
        })
      );
    }
  }
}
