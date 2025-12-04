// src/app/services/ticket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Ticket } from '../models/ticket.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function asArray<T>(data: T[] | Page<T>): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as Page<T>).results ?? [];
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  // usar base sin slash final y construir rutas explícitas
  private base = `${environment.apiUrl}/tickets`;

  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  private loaded = false;

  constructor(private http: HttpClient, private notificationService: NotificationService, private authService: AuthService) {}

  /** Obtener agente sugerido por el backend (el que sería asignado) */
  getSuggestedAgent(): Observable<{ username: string | null; full_name: string | null }> {
    return this.http.get<{ username: string | null; full_name: string | null }>(`${this.base}/sugerir_agente/`);
  }

  // tickets asignados al agente logueado (back-end: action 'assigned')
  getAssignedTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.base}/assigned/`);
  }

  deleteTicket(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}/`);
  }
  createTicket(data: any) {
    const payload = { ...data };
    delete payload.responsable; // evitar enviar campo que el backend asigna
    return this.http.post(`${this.base}/`, payload);
  }

  /** Stream para la tabla */
  getAll$(): Observable<Ticket[]> {
    if (!this.loaded) {
      this.http.get<Ticket[] | Page<Ticket>>(`${this.base}/`).subscribe({
        next: (data) => {
          this.ticketsSubject.next(asArray<Ticket>(data));
          this.loaded = true;
        },
        error: (e) => console.error('[TicketService] GET list error', e),
      });
    }
    return this.ticketsSubject.asObservable();
  }

  /** Forzar recarga desde servidor */
  reload(): void {
    this.http.get<Ticket[] | Page<Ticket>>(`${this.base}/`).subscribe({
      next: (data) => this.ticketsSubject.next(asArray<Ticket>(data)),
      error: (e) => console.error('[TicketService] reload error', e),
    });
  }

  /** Detalle por id */
  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}/`);
  }

  /** Crear y empujar al store */
  add(payload: Omit<Ticket, 'id' | 'fecha'>): Observable<Ticket> {
    const body = {
      titulo: (payload as any).titulo ?? null,
      descripcion: payload.descripcion,
      categoria: payload.categoria,
      prioridad: payload.prioridad,
      estado: payload.estado,
      responsable: payload.responsable,
      archivoName: payload.archivoName ?? null,
      archivoDataUrl: payload.archivoDataUrl ?? null,
    };

    return this.http.post<Ticket>(`${this.base}/`, body).pipe(
      tap((created) => {
        const current = Array.isArray(this.ticketsSubject.value)
          ? this.ticketsSubject.value
          : [];
        this.ticketsSubject.next([created, ...current]);
        
        // 🔔 Notificar al agente asignado que tiene un nuevo ticket
        // Usar agente_id del backend para notificación dirigida
        if (created.agente_id && created.agente_id > 0) {
          this.notificationService.notifyTicketAssigned(
            created.agente_id,
            created.id,
            created.titulo || '(Sin título)'
          );
        }
      })
    );
  }

  /** Actualizar parcial y sincronizar store */
  update(id: number, patch: Partial<Ticket>): void {
    const body: any = { ...patch };
    if ('archivoName' in body && body.archivoName === undefined)
      body.archivoName = null;
    if ('archivoDataUrl' in body && body.archivoDataUrl === undefined)
      body.archivoDataUrl = null;

    this.http.patch<Ticket>(`${this.base}/${id}/`, body).subscribe({
      next: (updated) => {
        const arr = (this.ticketsSubject.value ?? []).slice();
        this.ticketsSubject.next(arr.map((t) => (t.id === id ? updated : t)));
      },
      error: (e) => console.error('[TicketService] PATCH update error', e),
    });
  }

  /** Eliminar y actualizar store */
  delete(id: number): void {
    this.http.delete(`${this.base}/${id}/`).subscribe({
      next: () => {
        const arr = Array.isArray(this.ticketsSubject.value)
          ? this.ticketsSubject.value
          : [];
        this.ticketsSubject.next(arr.filter((t) => t.id !== id));
      },
      error: (e) => console.error('[TicketService] DELETE error', e),
    });
  }

  /** Actualiza un ticket (PATCH) y devuelve el ticket actualizado */
  updateTicket(id: number, patch: Partial<Ticket>): Observable<Ticket> {
  const body: any = { ...patch };
  if ('archivoName' in body && body.archivoName === undefined) body.archivoName = null;
  if ('archivoDataUrl' in body && body.archivoDataUrl === undefined) body.archivoDataUrl = null;

  // ✅ barra antes del id
  return this.http.patch<Ticket>(`${this.base}/${id}/`, body).pipe(
    tap(updated => {
      // 🔔 Notificar si el ticket fue cerrado
      if (patch.estado === 'Cerrado') {
        // Notificar al usuario actual (el que está cerrando el ticket es el agente)
        // El ticket se asocia al usuario que lo creó, pero como no tenemos ese ID,
        // notificamos a todos con userId = 0 para broadcast
        this.notificationService.notifyTicketClosed(
          0, // Broadcast a todos los usuarios involucrados
          updated.id,
          updated.titulo || '(Sin título)'
        );
      }
    })
  );
}

}
