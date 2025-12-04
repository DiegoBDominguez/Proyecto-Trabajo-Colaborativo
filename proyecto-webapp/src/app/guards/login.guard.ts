import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(): boolean {
    // Solo permite pasar si NO hay sesión activa
    const isLoggedIn = this.authService.isLoggedIn();
    
    if (isLoggedIn) {
      // Ya está logueado → lo mandamos al inicio según su rol
      const rol = this.authService.getRole();
      if (rol === 'admin') {
        this.router.navigate(['/inicio-admin']);
      } else if (rol === 'agente') {
        this.router.navigate(['/inicio-agente']);
      } else if (rol === 'usuario') {
        this.router.navigate(['/inicio-usuario']);
      } else {
        // Si no tiene rol válido, limpia y deja que inicie sesión de nuevo
        this.authService.logout();
        return true;
      }
      return false;
    }
    
    // No hay sesión → permite ver login
    return true;
  }
}
