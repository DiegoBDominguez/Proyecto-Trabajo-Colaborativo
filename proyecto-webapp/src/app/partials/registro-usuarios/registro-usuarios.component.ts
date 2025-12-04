import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuariosService } from 'src/app/services/usuarios.service';

@Component({
  selector: 'app-registro-usuarios',
  templateUrl: './registro-usuarios.component.html',
  styleUrls: ['./registro-usuarios.component.scss'],
})
export class RegistroUsuariosComponent implements OnInit {
  usuario: any = {};
  errors: any = {};
  editar = false;

  hide_1 = true;
  hide_2 = true;
  inputType_1 = 'password';
  inputType_2 = 'password';

  constructor(
    private router: Router,
    private usuarioService: UsuariosService
  ) {}

  ngOnInit() {
    // Inicializar usuario según el esquema del servicio
    this.usuario = this.usuarioService.esquemaUsuario();

    // Opcional: asignar valores por defecto para evitar errores
    this.usuario.fecha_nacimiento = this.usuario.fecha_nacimiento || '2000-01-01';
    this.usuario.direccion = this.usuario.direccion || 'Sin dirección';
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
    if (['Backspace','Tab','Delete','ArrowLeft','ArrowRight'].includes(event.key)) return;
    if (!/^\d$/.test(event.key) || (event.target as HTMLInputElement).value.length >= 10) {
      event.preventDefault();
    }
  }

  soloLetras(event: KeyboardEvent) {
    if (!/[a-zA-ZáéíóúÁÉÍÓÚ\s]/.test(event.key)) event.preventDefault();
  }

  registrar() {
    this.errors = {};
    // Validación general usando el service
    this.errors = this.usuarioService.validarDatos(this.usuario, this.editar, 'usuario');

    if (Object.keys(this.errors).length > 0) {
      console.log('Errores de validación:', this.errors);
      return;
    }

    if (this.usuario.password !== this.usuario.confirmar_password) {
      alert('Las contraseñas no coinciden');
      this.usuario.password = '';
      this.usuario.confirmar_password = '';
      return;
    }

    // Forzar username = email y rol = usuario
    const nuevoUsuario = {
      ...this.usuario,
      username: this.usuario.email,
      rol: 'usuario'
    };

    // Llamada al service unificado
    this.usuarioService.registrar(nuevoUsuario, 'usuario').subscribe(
      (response) => {
        alert('Usuario registrado correctamente');
        console.log('Usuario registrado:', response);
        this.router.navigate(['/']); // Redirigir al inicio
      },
      (error) => {
        if (error.error) {
          this.errors = error.error;
          console.error('Errores del backend:', error.error);
        } else {
          alert('No se pudo registrar el usuario');
          console.error(error);
        }
      }
    );
  }

  actualizar() {
    alert('Función de actualizar aún no implementada');
  }

  regresar() {
    this.router.navigate(['/']);
  }
}
