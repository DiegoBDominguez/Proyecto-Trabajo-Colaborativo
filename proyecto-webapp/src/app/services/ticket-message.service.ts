import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

export interface Attachment {
  id?: number;
  nombre: string;
  archivo: string; // URL
  tipo?: string;
  tamano?: number;
  fecha_subida?: string;
}

export interface MensajeTicket {
  id: number;
  ticket: number;
  usuario: string;
  usuarioFullName: string;
  texto: string;
  esAgente: boolean;
  fecha: string;
  attachments?: Attachment[];
}

@Injectable({
  providedIn: 'root'
})
export class TicketMessageService {
  private apiUrl = `${environment.url_api}/tickets`;

  // Observable para mensajes del ticket actual
  private mensajesSubject = new BehaviorSubject<MensajeTicket[]>([]);
  public mensajes$ = this.mensajesSubject.asObservable();

  // Ticket ID actual
  private ticketIdActualSubject = new BehaviorSubject<number | null>(null);
  public ticketIdActual$ = this.ticketIdActualSubject.asObservable();

  constructor(private http: HttpClient, private notificationService: NotificationService, private authService: AuthService) {}

  /**
   * Carga los mensajes de un ticket específico
   */
  cargarMensajes(ticketId: number): void {
    this.ticketIdActualSubject.next(ticketId);
    this.http.get<MensajeTicket[]>(`${this.apiUrl}/${ticketId}/mensajes/`).subscribe({
      next: (data) => {
        // Normalizar y ordenar por fecha
        const mensajesNorm = (data || []).map(d => this.normalizeMensaje(d));
        const mensajesOrdenados = mensajesNorm.sort((a, b) =>
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        this.mensajesSubject.next(mensajesOrdenados);
      },
      error: (e) => console.error('[TicketMessageService] Error cargando mensajes', e)
    });
  }

  /**
   * Obtiene los mensajes como observable
   */
  getMensajes(): Observable<MensajeTicket[]> {
    return this.mensajes$;
  }

  /**
   * Envía una respuesta a un ticket
   */
  responder(ticketId: number, texto: string, recipientUserId?: number, files?: File[]): Observable<MensajeTicket> {
    // Si se envían archivos, construir FormData y hacer multipart POST
    let request$: Observable<any>;
    if (files && files.length > 0) {
      const fd = new FormData();
      fd.append('texto', texto);
      files.forEach(f => fd.append('archivos', f, f.name));
      // Debug: listar contenido del FormData para depuración en consola
      try {
        const entries: string[] = [];
        // No podemos iterar FormData keys in all browsers synchronously here without side effects,
        // pero podemos at least log file names
        for (let i = 0; i < files.length; i++) {
          entries.push(files[i].name + ' (' + files[i].size + ' bytes)');
        }
        console.log('[TicketMessageService] Enviando FormData archivos:', entries);
      } catch (err) {
        console.warn('[TicketMessageService] Error building debug log for FormData', err);
      }

      request$ = this.http.post<any>(`${this.apiUrl}/${ticketId}/responder/`, fd);
    } else {
      request$ = this.http.post<any>(`${this.apiUrl}/${ticketId}/responder/`, { texto });
    }

    return request$.pipe(
      map((raw: any) => this.normalizeMensaje(raw)),
      tap((mensaje) => {
        // Delegamos la creación/entrega de notificaciones al backend.
        // El backend crea notificaciones persistentes y emite eventos WebSocket
        // tanto cuando un agente responde (notifica al propietario) como cuando
        // un usuario responde (notifica al/los agente(s) responsables).
        // Evitamos crear notificaciones locales aquí para prevenir duplicados
        // y problemas de destinatario incorrecto.
        console.log('[TicketMessageService] Respuesta enviada — notificaciones delegadas al backend');
      })
    );
  }

  /**
   * Limpia los mensajes del ticket actual
   */
  limpiar(): void {
    this.ticketIdActualSubject.next(null);
    this.mensajesSubject.next([]);
  }

  private normalizeMensaje(raw: any): MensajeTicket {
    console.log('[TicketMessageService] Normalizando mensaje:', raw);
    // Detectar attachments en distintas formas que el backend podría enviar
    const rawAttachments = raw.attachments || raw.archivos || raw.files || [];

    // Base URL del backend (por ejemplo: http://127.0.0.1:8000)
    const backendBase = (environment.url_api || '').replace(/\/api.*$/i, '');

    const attachments = (rawAttachments || []).map((a: any) => {
      let nombre = a.nombre || a.name || a.filename || a.file_name || a.archivo_nombre || '';
      let archivo = a.archivo || a.file || a.url || a.file_url || a.archivo_url || '';

      // Si la URL no es absoluta, convertirla a absoluta usando backendBase
      if (archivo && !/^https?:\/\//i.test(archivo)) {
        // asegurar slash entre base y path
        if (!archivo.startsWith('/')) archivo = '/' + archivo;
        archivo = backendBase.replace(/\/$/, '') + archivo;
      }

      // Si no hay nombre, intentar inferirlo desde la URL
      if ((!nombre || nombre.trim() === '') && archivo) {
        try {
          const parts = archivo.split('/');
          nombre = decodeURIComponent(parts[parts.length - 1] || '') || nombre;
        } catch (err) {
          // noop
        }
      }

      return {
        id: a.id,
        nombre: nombre,
        archivo: archivo,
        tipo: a.tipo || a.content_type || a.mime,
        tamano: a.tamano || a.size,
        fecha_subida: a.fecha_subida || a.uploaded_at || a.created_at,
      };
    });

    return {
      id: raw.id,
      ticket: raw.ticket,
      usuario: raw.usuario ?? '',
      usuarioFullName: raw.usuarioFullName ?? '',
      texto: raw.texto ?? '',
      esAgente: raw.es_agente ?? raw.esAgente ?? false,
      fecha: raw.fecha ?? new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
  }
}
