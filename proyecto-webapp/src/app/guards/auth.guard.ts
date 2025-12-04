// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('access_token');

    if (token) {
      // ✅ Usuario logueado -> permite entrar
      return true;
    }

    // ❌ No logueado -> redirige al login
    this.router.navigate(['/login-screen']);  // 👈 Usa tu ruta real
    return false;
  }
}
