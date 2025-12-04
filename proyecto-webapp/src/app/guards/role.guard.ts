import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (!this.auth.isLoggedIn()) return this.router.parseUrl('/login-screen');

    const allowed: string[] = route.data?.['roles'] ?? [];
    const rol = this.auth.getRole();

    if (allowed.length === 0 || (rol && allowed.includes(rol))) return true;

    if (rol === 'admin')   return this.router.parseUrl('/inicio-admin');
    if (rol === 'agente')  return this.router.parseUrl('/inicio-agente');
    if (rol === 'usuario') return this.router.parseUrl('/inicio-usuario');

    return this.router.parseUrl('/login-screen');
  }
}
