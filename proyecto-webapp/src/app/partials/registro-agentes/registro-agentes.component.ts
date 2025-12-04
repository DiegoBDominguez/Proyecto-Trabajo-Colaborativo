import { Component, OnInit } from '@angular/core';
import { AgentesService } from 'src/app/services/agentes.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro-agentes',
  templateUrl: './registro-agentes.component.html',
  styleUrls: ['./registro-agentes.component.scss']
})
export class RegistroAgentesComponent implements OnInit {

  agente: any = {};
  errors: any = {};
  editar = false;

  hide_1 = true;
  hide_2 = true;
  inputType_1 = 'password';
  inputType_2 = 'password';

  constructor(
    private agentesService: AgentesService,
    private router: Router
  ) {}

  ngOnInit() {
    // Inicializar un agente vacío usando el esquema del service
    this.agente = this.agentesService.esquemaAgente();
  }

  showPassword() {
    this.hide_1 = !this.hide_1;
    this.inputType_1 = this.hide_1 ? 'password' : 'text';
  }

  showPwdConfirmar() {
    this.hide_2 = !this.hide_2;
    this.inputType_2 = this.hide_2 ? 'password' : 'text';
  }

  soloNumeros(event: KeyboardEvent) {
    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'Delete' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) return;

    if (!/^\d$/.test(event.key) || (event.target as HTMLInputElement).value.length >= 10) {
      event.preventDefault();
    }
  }

  soloLetras(event: KeyboardEvent) {
    if (!/[a-zA-ZáéíóúÁÉÍÓÚ\s]/.test(event.key)) {
      event.preventDefault();
    }
  }

  registrar() {
    // Limpiar errores
    this.errors = {};

    // Validar usando el service
    this.errors = this.agentesService.validarAgente(this.agente, this.editar);

    if (Object.keys(this.errors).length > 0) {
      console.log('Errores de validación:', this.errors);
      return;
    }

    // Validar que las contraseñas coincidan
    if (this.agente.password !== this.agente.confirmar_password) {
      alert('Las contraseñas no coinciden');
      this.agente.password = '';
      this.agente.confirmar_password = '';
      return;
    }

    // Construir el objeto que se enviará al backend
    const nuevoAgente = {
      username: this.agente.email, // username = correo
      email: this.agente.email,
      password: this.agente.password,
      first_name: this.agente.first_name,
      last_name: this.agente.last_name,
      telefono: this.agente.telefono,
      especialidad: this.agente.especialidad,
      experiencia: this.agente.experiencia,
      rol: 'agente' // rol fijo
    };

    // Llamada al servicio para registrar
    this.agentesService.registrarAgente(nuevoAgente).subscribe(
      (response) => {
        alert('Agente registrado correctamente');
        console.log('Agente registrado:', response);
        this.router.navigate(['/']); // Redirigir al inicio o dashboard
      },
      (error) => {
        // Manejar errores de backend
        if (error.error) {
          this.errors = error.error;
          console.error('Errores del backend:', error.error);
        } else {
          alert('No se pudo registrar el agente');
          console.error(error);
        }
      }
    );
  }

  // Función para cancelar y regresar
  regresar() {
    this.router.navigate(['/']);
  }

  // Función para actualizar (puedes implementar más adelante)
  actualizar() {
    alert('Función de actualizar aún no implementada');
  }
}
