// src/app/screens/login-screen/login-screen.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login-screen',
  templateUrl: './login-screen.component.html',
  styleUrls: ['./login-screen.component.scss']
})
export class LoginScreenComponent {
  // Campos de formulario
  username = '';   // si tu input representa el correo, puedes renombrarlo a "email"
  password = '';

  // Estado UI
  loading = false;

  // Control de visibilidad del password (lo usa tu template)
  type: 'password' | 'text' = 'password';
  showPassword(): void {
    this.type = this.type === 'password' ? 'text' : 'password';
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    // Validación básica
    if (!this.username.trim() || !this.password.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (res: LoginResponse) => {
        console.log('%c✔ Login exitoso', 'color:green;font-weight:700;');
        console.log('%cROL DEL USUARIO:', 'color:#334155;font-weight:700;', res.rol);

        // Normaliza/extrae rol
        const rol = res.rol ?? res.user?.rol ?? null;

        // Redirección según rol
        if (rol === 'admin') {
          this.router.navigate(['/inicio-admin']);
        } else if (rol === 'agente') {
          this.router.navigate(['/inicio-agente']);
        } else if (rol === 'usuario') {
          this.router.navigate(['/inicio-usuario']);
        } else {
          alert('No se pudo identificar el rol del usuario.');
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('%c✗ Error en login:', 'color:red;font-weight:700;', err);
        alert('Correo o contraseña incorrectos. Por favor, intenta de nuevo.');
        this.loading = false;
      }
    });
  }
}
