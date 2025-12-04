import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ConversacionChat {
  id: number;
  usuarioId: number;
  agenteId: number;
  agenteName?: string;
  agentEmail?: string;
  usuarioName?: string;
  usuarioEmail?: string;
  ticketId?: number;
  ticketAsunto?: string;
  ultimoMensaje?: string;
  ultimaActividad?: string;
  noLeidos?: number;
}

export interface MensajeChat {
  id: number;
  conversacionId: number;
  remitente: string; // username
  esAgente: boolean;
  texto: string;
  fecha: string; // ISO
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Use the full `apiUrl` and append the chat prefix so endpoints
  // resolve under /api/cuentas/chat/... as configured in Django
  private apiUrl = `${environment.apiUrl}/chat`;

  // Observable para lista de conversaciones
  private conversacionesSubject = new BehaviorSubject<ConversacionChat[]>([]);
  public conversaciones$ = this.conversacionesSubject.asObservable();

  // Observable para mensajes de la conversación actual
  private mensajesSubject = new BehaviorSubject<MensajeChat[]>([]);
  public mensajes$ = this.mensajesSubject.asObservable();

  // Subject para nuevos mensajes en tiempo real
  public nuevoMensaje$ = new Subject<MensajeChat>();

  // Conversación actualmente seleccionada
  private conversacionActualSubject = new BehaviorSubject<ConversacionChat | null>(null);
  public conversacionActual$ = this.conversacionActualSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarConversaciones();
  }

  private normalizeMensaje(raw: any): MensajeChat {
    // Normalize server fields (snake_case) to frontend camelCase
    return {
      id: raw.id,
      conversacionId: raw.conversacion ?? raw.conversacionId ?? 0,
      remitente: raw.remitente ?? raw.remitente ?? '',
      esAgente: raw.es_agente ?? raw.esAgente ?? false,
      texto: raw.texto ?? raw.mensaje ?? '',
      fecha: raw.fecha ?? new Date().toISOString(),
    } as MensajeChat;
  }

  /**
   * Carga todas las conversaciones del usuario actual
   */
  cargarConversaciones(): void {
    this.http.get<ConversacionChat[]>(`${this.apiUrl}/conversaciones/`).subscribe({
      next: (data) => {
        this.conversacionesSubject.next(data);
      },
      error: (e) => console.error('[ChatService] Error cargando conversaciones', e)
    });
  }

  /**
   * Obtiene todas las conversaciones como observable
   */
  getConversaciones(): Observable<ConversacionChat[]> {
    return this.conversaciones$;
  }

  /**
   * Obtiene mensajes de una conversación específica
   */
  cargarMensajes(conversacionId: number): void {
    this.http.get<MensajeChat[]>(`${this.apiUrl}/conversaciones/${conversacionId}/mensajes/`).subscribe({
      next: (data) => {
        // Normalizar y ordenar por fecha ascendente
        const mensajesNorm = (data || []).map(d => this.normalizeMensaje(d));
        const mensajesOrdenados = mensajesNorm.sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        this.mensajesSubject.next(mensajesOrdenados);
      },
      error: (e) => console.error('[ChatService] Error cargando mensajes', e)
    });
  }

  /**
   * Obtiene los mensajes como observable
   */
  getMensajes(): Observable<MensajeChat[]> {
    return this.mensajes$;
  }

  /**
   * Selecciona una conversación
   */
  seleccionarConversacion(conversacion: ConversacionChat): void {
    this.conversacionActualSubject.next(conversacion);
    this.cargarMensajes(conversacion.id);
    // Marcar como leído
    this.marcarComoLeido(conversacion.id).subscribe();
  }

  /**
   * Obtiene la conversación actual
   */
  getConversacionActual(): ConversacionChat | null {
    return this.conversacionActualSubject.value;
  }

  /**
   * Envía un mensaje
   */
  enviarMensaje(conversacionId: number, texto: string): Observable<MensajeChat> {
    // Backend exposes an action `enviar_mensaje` on the conversation viewset
    return this.http.post<MensajeChat>(`${this.apiUrl}/conversaciones/${conversacionId}/enviar_mensaje/`, { texto })
      .pipe(
        map((raw: any) => this.normalizeMensaje(raw)),
        tap((mensaje) => {
          // Optimistic append: agregar el mensaje al stream de mensajes inmediatamente
          // para que el remitente lo vea sin esperar al broadcast del WebSocket
          const conversacionActual = this.conversacionActualSubject.value;
          if (conversacionActual && conversacionActual.id === conversacionId) {
            const mensajeActual = this.mensajesSubject.value || [];
            this.mensajesSubject.next([...mensajeActual, mensaje]);
          }
        })
      );
  }

  /**
   * Marca una conversación como leída
   */
  marcarComoLeido(conversacionId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/conversaciones/${conversacionId}/leido/`, {});
  }

  /**
   * Inicia una nueva conversación (con un agente o por ticket)
   */
  iniciarConversacion(agenteId?: number, ticketId?: number): Observable<ConversacionChat> {
    const payload = { agenteId, ticketId };
    return this.http.post<ConversacionChat>(`${this.apiUrl}/conversaciones`, payload);
  }

  /**
   * Inicia una conversación por email del agente
   */
  iniciarConversacionPorEmail(agentEmail: string): Observable<ConversacionChat> {
    // Django action is named `por_email` (snake_case)
    return this.http.post<ConversacionChat>(`${this.apiUrl}/conversaciones/por_email/`, {
      email: agentEmail
    });
  }

  /**
   * Busca conversaciones por palabra clave
   */
  buscarConversaciones(query: string): Observable<ConversacionChat[]> {
    return this.http.get<ConversacionChat[]>(`${this.apiUrl}/conversaciones/buscar?q=${encodeURIComponent(query)}`);
  }

  /**
   * Buscar usuarios por email (devuelve id, email, username, rol)
   */
  buscarUsuariosPorEmail(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversaciones/buscar?q=${encodeURIComponent(query)}`);
  }

  /**
   * Llamado cuando llega un mensaje en tiempo real (desde WebSocket)
   */
  recibirMensajeEnTiempoReal(mensaje: MensajeChat): void {
    console.log('[ChatService] Mensaje WS recibido:', mensaje, 'conversacionActual:', this.conversacionActualSubject.value);
    
    // Emitir nuevo mensaje por el Subject general
    this.nuevoMensaje$.next(mensaje);

    const conversacionActual = this.conversacionActualSubject.value;

    // Si el mensaje pertenece a la conversación actualmente abierta,
    // agregarlo al stream de mensajes (para que se muestre en el panel).
    if (conversacionActual && conversacionActual.id === mensaje.conversacionId) {
      console.log('[ChatService] Agregando mensaje a mensajesSubject (conversación abierta)');
      const mensajeActual = this.mensajesSubject.value;
      this.mensajesSubject.next([...mensajeActual, mensaje]);
    } else {
      // Si no es para la conversación abierta, incrementar contador de no leídos
      const conversaciones = this.conversacionesSubject.value.slice();
      const idx = conversaciones.findIndex(c => c.id === mensaje.conversacionId);
      if (idx >= 0) {
        console.log('[ChatService] Incrementando no leídos para conversación', mensaje.conversacionId);
        conversaciones[idx].ultimoMensaje = mensaje.texto;
        conversaciones[idx].ultimaActividad = mensaje.fecha;
        conversaciones[idx].noLeidos = (conversaciones[idx].noLeidos || 0) + 1;
        this.conversacionesSubject.next(conversaciones);
      }
    }
  }

  /**
   * Recarga todas las conversaciones
   */
  recargar(): void {
    this.cargarConversaciones();
  }

  /**
   * Limpia la conversación y los mensajes actualmente cargados.
   * Útil para dejar la bandeja vacía hasta que el usuario seleccione una conversación.
   */
  limpiarConversacionActual(): void {
    this.conversacionActualSubject.next(null);
    this.mensajesSubject.next([]);
  }
}
