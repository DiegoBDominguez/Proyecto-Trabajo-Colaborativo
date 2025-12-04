import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdministradoresService } from 'src/app/services/administradores.service';

@Component({
  selector: 'app-registro-admin',
  templateUrl: './registro-admin.component.html',
  styleUrls: ['./registro-admin.component.scss']
})
export class RegistroAdminComponent implements OnInit {
  admin: any = {};
  errors: any = {};
  editar = false;

  hide_1 = true;
  hide_2 = true;
  inputType_1 = 'password';
  inputType_2 = 'password';

  constructor(
    private router: Router,
    private adminService: AdministradoresService
  ) {}

  ngOnInit() {
    this.admin = this.adminService.esquemaAdmin(); // Inicializa el esquema del admin
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
      ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)
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
    // Validar campos obligatorios
    if (!this.admin.email || !this.admin.password || !this.admin.confirmar_password ||
        !this.admin.first_name || !this.admin.last_name) {
      alert("Todos los campos obligatorios son necesarios.");
      return;
    }

    // Validar que las contraseñas coincidan
    if (this.admin.password !== this.admin.confirmar_password) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    // Construir objeto a enviar al backend
    const nuevoAdmin = {
      username: this.admin.email, // username = email
      email: this.admin.email,
      password: this.admin.password,
      first_name: this.admin.first_name,
      last_name: this.admin.last_name,
      telefono: this.admin.telefono || '',
      rfc: this.admin.rfc || '',
      edad: this.admin.edad || null,
      ocupacion: this.admin.ocupacion || '',
      rol: 'admin' // rol fijo
    };

    // Llamada al servicio para registrar
    this.adminService.registrarAdmin(nuevoAdmin).subscribe(
      (response) => {
        alert('Admin registrado correctamente');
        console.log('Admin registrado:', response);
        this.router.navigate(['/login-screen']);
      },
      (error) => {
        if (error.error) {
          this.errors = error.error;
          console.error('Errores del backend:', error.error);
        } else {
          alert('No se pudo registrar el admin');
          console.error(error);
        }
      }
    );
  }

  actualizar() {
    console.log('Actualizar admin:', this.admin);
  }

  regresar() {
    this.router.navigate(['/']);
  }
}
