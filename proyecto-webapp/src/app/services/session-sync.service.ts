import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionSyncService {
  
  constructor(private authService: AuthService, private router: Router) {
    this.initializeStorageListener();
  }

  /**
   * Escucha cambios en localStorage desde otras pestañas
   * Si se borra access_token, significa que otra pestaña cerró sesión
   */
  private initializeStorageListener(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'access_token' && event.newValue === null) {
        // El token fue borrado en otra pestaña
        console.log('[SessionSync] Token eliminado en otra pestaña, cerrando sesión...');
        this.authService.logout();
      }

      if (event.key === 'rol' && event.newValue === null) {
        // El rol fue borrado
        console.log('[SessionSync] Rol eliminado en otra pestaña, cerrando sesión...');
        this.authService.logout();
      }
    });

    // También monitorea cambios del usuario
    window.addEventListener('beforeunload', () => {
      // Opcional: sincronizar timestamp de última actividad
      localStorage.setItem('lastActivity', new Date().getTime().toString());
    });
  }
}
