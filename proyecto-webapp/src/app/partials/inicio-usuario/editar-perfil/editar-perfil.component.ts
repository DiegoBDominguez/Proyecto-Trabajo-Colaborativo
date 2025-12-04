import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.component.html', 
  styleUrls: ['./editar-perfil.component.scss'] 
})
export class EditarPerfilComponent {
  form: FormGroup;
  successMsg = '';

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.form.controls;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Guardar localmente por ahora
    localStorage.setItem('perfil_usuario', JSON.stringify(this.form.value));

    this.successMsg = 'Datos del perfil actualizados correctamente.';
    setTimeout(() => {
      this.router.navigate(['/inicio-usuario']);
    }, 800);
  }

  cancelar() {
    this.router.navigate(['/inicio-usuario']);
  }
}
