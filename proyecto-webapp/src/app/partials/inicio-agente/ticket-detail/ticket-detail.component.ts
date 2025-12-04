// src/app/partials/inicio-agente/ticket-detail/ticket-detail.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { TicketService } from '../../../services/ticket.service';
import { TicketMessageService, MensajeTicket } from '../../../services/ticket-message.service';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss']
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  ticket: Ticket | undefined;
  mensajes: MensajeTicket[] = [];
  response: string = '';
  enviando = false;
  selectedFiles: File[] = [];
  previews: { url: string, name: string, isImage: boolean }[] = [];
  isDragOver = false;
  errorMessage: string = '';
  
  // Estado editable
  editEstado = false;
  saving = false;
  selectedEstado: 'Nuevo' | 'Enviado' | 'Abierto' | 'Respondido' | 'En Proceso' | 'Cerrado' = 'Abierto';
  estadosPosibles: string[] = ['Nuevo', 'Enviado', 'Abierto', 'Respondido', 'En Proceso', 'Cerrado'];

  private subTicket: Subscription | undefined;
  private subMensajes: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private ticketService: TicketService,
    private ticketMessageService: TicketMessageService
  ) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.cargarTicket(id);
    
    // Suscribirse a mensajes del ticket
    this.subMensajes = this.ticketMessageService.getMensajes().subscribe(msgs => {
      this.mensajes = msgs;
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Cargar mensajes del ticket
    this.ticketMessageService.cargarMensajes(id);
  }

  ngOnDestroy() {
    this.subTicket?.unsubscribe();
    this.subMensajes?.unsubscribe();
    this.ticketMessageService.limpiar();
  }

  cargarTicket(id: number) {
    this.subTicket = this.ticketService.getById(id).subscribe({
      next: (t) => {
        this.ticket = t as Ticket;
        console.log('[TicketDetail] ticket payload:', t);
        // Si el ticket llegó como 'Nuevo' o 'Enviado', marcarlo automáticamente como 'Abierto'
        if (this.ticket && (this.ticket.estado === 'Nuevo' || this.ticket.estado === 'Enviado')) {
          this.ticketService.updateTicket(this.ticket.id, { estado: 'Abierto' }).subscribe({
            next: (updated) => {
              this.ticket!.estado = updated.estado;
            },
            error: (e) => console.error('[TicketDetail] error auto-abriendo ticket', e)
          });
        }
      },
      error: (e) => console.error('[TicketDetail] error cargando ticket', e)
    });
  }

  enviarRespuesta() {
    if ((this.response.trim() === '' && this.selectedFiles.length === 0) || !this.ticket) return;
    
    if (this.errorMessage) {
      alert('Por favor, corrige los errores de archivos antes de enviar');
      return;
    }
    
    this.enviando = true;
    const textoAEnviar = this.response.trim() !== '' ? this.response : (this.selectedFiles.length > 0 ? ' ' : '');
    this.ticketMessageService.responder(this.ticket.id, textoAEnviar, this.ticket?.usuario_id, this.selectedFiles).subscribe({
      next: (msg) => {
        // Agregar el mensaje a la lista
        this.mensajes = [...this.mensajes, msg];
        this.response = '';
        this.selectedFiles = [];
        this.previews.forEach(p => URL.revokeObjectURL(p.url));
        this.previews = [];
        this.errorMessage = '';
        this.enviando = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (e) => {
        console.error('[TicketDetail] error enviando respuesta', e);
        const errMsg = e?.error?.error || e?.error?.detail || 'Error al enviar la respuesta';
        this.errorMessage = errMsg;
        this.enviando = false;
      }
    });
  }

  onFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.selectedFiles = Array.from(input.files);
    this.generatePreviews();
    this.validateFiles();
  }

  onDragOver(e: Event) {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(e: Event) {
    e.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    if (e.dataTransfer?.files) {
      this.selectedFiles = Array.from(e.dataTransfer.files);
      this.generatePreviews();
      this.validateFiles();
    }
  }

  private generatePreviews() {
    this.previews.forEach(p => URL.revokeObjectURL(p.url));
    this.previews = this.selectedFiles.map(f => ({
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      name: f.name,
      isImage: f.type.startsWith('image/')
    }));
  }

  private validateFiles() {
    this.errorMessage = '';
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (const f of this.selectedFiles) {
      if (f.size > MAX_FILE_SIZE) {
        this.errorMessage = `Archivo "${f.name}" excede el límite de 10 MB`;
        break;
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        this.errorMessage = `Tipo de archivo no permitido: ${f.type}. Solo imágenes, PDF y Word.`;
        break;
      }
    }
  }

  removeFile(index: number) {
    if (this.previews[index]) {
      URL.revokeObjectURL(this.previews[index].url);
    }
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
    this.validateFiles();
  }

  goBack() {
    this.location.back();
  }

  private scrollToBottom() {
    const container = document.querySelector('.ticket-content') as HTMLElement;
    if (container) container.scrollTop = container.scrollHeight;
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'Respondido': return 'status-replied';
      case 'Nuevo': return 'status-new';
      case 'Abierto': return 'status-open';
      case 'En Proceso': return 'status-in-progress';
      case 'Cerrado': return 'status-closed';
      default: return '';
    }
  }

  getPriorityClass(priority?: string): string {
    switch (priority) {
      case 'Alta': return 'priority-high';
      case 'Media': return 'priority-medium';
      case 'Baja': return 'priority-low';
      default: return '';
    }
  }

  toggleEditEstado() {
    this.editEstado = !this.editEstado;
    if (this.ticket?.estado) {
      this.selectedEstado = this.ticket.estado;
    }
  }

  saveEstado() {
    if (!this.ticket) return;
    if (this.selectedEstado !== this.ticket.estado) {
      this.saving = true;
      this.ticketService.updateTicket(this.ticket.id, { estado: this.selectedEstado }).subscribe({
        next: (updated) => {
          this.ticket!.estado = updated.estado;
          this.saving = false;
          this.editEstado = false;
        },
        error: (e) => {
          console.error('[TicketDetail] error actualizando estado', e);
          this.saving = false;
          this.editEstado = false;
        }
      });
    } else {
      this.editEstado = false;
    }
  }

  isClosed(t?: Ticket): boolean {
    return !!t && t.estado === 'Cerrado';
  }

  estadoClass(estado?: string): string {
    if (!estado) return '';
    switch (estado) {
      case 'Respondido': return 'estado-respondido';
      case 'Nuevo': return 'estado-nuevo';
      case 'Abierto': return 'estado-abierto';
      case 'En Proceso': return 'estado-en-proceso';
      case 'Cerrado': return 'estado-cerrado';
      default: return '';
    }
  }

  /** Devuelve el contacto del reportante: email si está, sino el nombre o el autor del primer mensaje */
  getReporterName(): string {
    if (this.ticket) {
      if (this.ticket.usuario_nombre) return this.ticket.usuario_nombre;
      // fall back to first message author if no explicit name
    }
    if (this.mensajes && this.mensajes.length > 0) {
      const first = this.mensajes[0];
      return first.usuarioFullName || first.usuario || 'No disponible';
    }
    return 'No disponible';
  }

  getReporterEmail(): string {
    // Sólo usar el campo proporcionado por el backend
    if (this.ticket && this.ticket.usuario_email) return this.ticket.usuario_email;
    return '—';
  }

  getReporterContact(): string {
    const name = this.getReporterName();
    const email = this.getReporterEmail();
    if (name && name !== 'No disponible' && email && email !== 'No disponible') return `${name} (${email})`;
    if (email && email !== 'No disponible') return email;
    return name;
  }


  cerrarTicket() {
    if (!this.ticket) return;
    const confirmacion = confirm('¿Estás seguro de que deseas cerrar este ticket?');
    if (confirmacion) {
      this.saving = true;
      this.ticketService.updateTicket(this.ticket.id, { estado: 'Cerrado' }).subscribe({
        next: (updated) => {
          this.ticket!.estado = updated.estado;
          this.saving = false;
          alert('Ticket cerrado correctamente');
          this.goBack();
        },
        error: (e) => {
          console.error('[TicketDetail] error cerrando ticket', e);
          this.saving = false;
        }
      });
    }
  }

  // Devuelve true si el attachment parece ser una imagen
  isAttachmentImage(attachment: any): boolean {
    if (!attachment) return false;
    const tipo = (attachment.tipo || '').toString();
    if (tipo.startsWith('image/')) return true;
    const nombre = (attachment.nombre || '').toString();
    return /\.(jpe?g|png|gif|webp|bmp)$/i.test(nombre);
  }

  // Formatea bytes a string legible
  formatBytes(bytes: number | undefined): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}