import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro-usuarios-screen',
  templateUrl: './registro-usuarios-screen.component.html',
  styleUrls: ['./registro-usuarios-screen.component.scss']
})
export class RegistroUsuariosScreenComponent {
  tipo_user: string = '';

  constructor(private router: Router) {}

  selectRole(role: string) {
    this.tipo_user = role;
  }

  continuarRegistro() {
  if (this.tipo_user === 'usuario') {
    this.router.navigate(['/registro-usuarios']); // Navega al componente de registro de usuarios
  } else if (this.tipo_user === 'agente') {
    this.router.navigate(['/registro-agentes']); // Navega al componente de registro de agentes
  } else if (this.tipo_user === 'administrador') {
    this.router.navigate(['/registro-admin']); // Navega al componente de registro de administradores
  }
}
}
