import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from '../../../services/ticket.service';
import { Router } from '@angular/router';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-crear-ticket',
  templateUrl: './crear-ticket.component.html',
  styleUrls: ['./crear-ticket.component.scss']
})
export class CrearTicketComponent implements OnInit {
  form: FormGroup;
  filePreview: string | null = null;
  fileName: string | null = null;
  submitting = false;
  successMsg = '';

  prioridades = ['Baja', 'Media', 'Alta'];
  categorias = ['Software', 'Hardware', 'Red', 'Soporte General'];

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private router: Router
  ) {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(5)]],
      categoria: ['', Validators.required], // Valor inicial vacío
      prioridad: ['', Validators.required], // Valor inicial vacío
      // `responsable` será mostrado como no editable: backend asigna el agente
      responsable: [''],
      archivo: [null]
    });
  }

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // solicitar al backend el agente que se asignaría y mostrarlo en el campo
    this.ticketService.getSuggestedAgent().subscribe({
      next: (data) => {
        if (data && data.username) {
          const display = data.full_name ?? data.username;
          this.form.patchValue({ responsable: display });
          // dejar el control disabled para que no sea editable
          this.form.get('responsable')?.disable();
        } else {
          this.form.patchValue({ responsable: 'Asignación automática' });
          this.form.get('responsable')?.disable();
        }
      },
      error: (e) => {
        console.error('No se pudo obtener agente sugerido', e);
        this.form.patchValue({ responsable: 'Asignación automática' });
        this.form.get('responsable')?.disable();
      }
    });
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.filePreview = null;
      this.fileName = null;
      this.form.patchValue({ archivo: null });
      return;
    }

    const file = input.files[0];
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El archivo no puede superar los 5MB.');
      this.filePreview = null;
      this.fileName = null;
      this.form.patchValue({ archivo: null });
      return;
    }

    if (!file.type.match('image.*|application/pdf')) {
      alert('Solo se permiten imágenes o PDF.');
      return;
    }

    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.filePreview = reader.result as string;
      this.form.patchValue({ archivo: this.filePreview });
    };
    reader.readAsDataURL(file);
  }

  submit() {
    this.submitting = true;
    this.successMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitting = false;
      return;
    }

    const payload: Omit<Ticket, 'id' | 'fecha'> = {
      titulo: this.form.get('titulo')!.value,
      descripcion: this.form.get('descripcion')!.value,
      categoria: this.form.get('categoria')!.value,
      prioridad: this.form.get('prioridad')!.value,
      estado: 'Enviado',
      responsable: this.form.get('responsable')!.value,
      archivoName: this.fileName ?? null,
      archivoDataUrl: this.form.get('archivo')?.value ?? null
    };

    this.ticketService.add(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMsg = '¡Ticket creado correctamente! Redirigiendo...';
        this.form.reset({ prioridad: '', categoria: '' }); // Restablece a valores vacíos
        setTimeout(() => this.router.navigate(['/inicio-usuario/mis-tickets']), 2000);
      },
      error: (err) => {
        console.error('Error creando ticket', err);
        this.submitting = false;
        this.successMsg = 'Error: No se pudo crear el ticket. Intenta nuevamente.';
      }
    });
  }

  cancelar() {
    this.form.reset({ prioridad: '', categoria: '' }); // Restablece a valores vacíos
    this.router.navigate(['/inicio-usuario/mis-tickets']);
  }
}