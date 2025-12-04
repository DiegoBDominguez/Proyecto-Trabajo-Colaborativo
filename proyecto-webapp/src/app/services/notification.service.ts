import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, interval } from 'rxjs';
import { Notification } from '../models/notification.model';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NotificationWsService } from './notification-ws.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);
  private currentUserId: number | null = null;
  private currentUserRole: 'admin' | 'agente' | 'usuario' | null = null;
  private apiUrl = `${environment.url_api}/notifications`;
  private pollInterval: any; // para auto-polling de notificaciones

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private notificationWsService: NotificationWsService
  ) {
    // Obtener el ID del usuario actual
    const user = this.authService.getUser();
    if (user) {
      this.currentUserId = user.id;
    }
    // Rol actual (si está disponible)
    this.currentUserRole = this.authService.getRole();
    this.loadNotifications();
    
    // Conectar WebSocket para notificaciones en tiempo real
    if (this.currentUserId) {
      this.notificationWsService.connect();
      this.setupWebSocketListeners();
    }

    // Polling automático cada 5 segundos para asegurar que se cargan nuevas notificaciones
    // (fallback si el WebSocket falla)
    this.startAutoPoll();
  }

  private setupWebSocketListeners() {
    // Escuchar nuevas notificaciones por WebSocket
    this.notificationWsService.notificationReceived$.subscribe((msg) => {
      if (msg.type === 'notification' || msg.type === 'pending_notification') {
        // Recargar notificaciones desde el backend
        this.loadNotifications();
      }
    });
  }

  private startAutoPoll(): void {
    // Auto-refresh de notificaciones cada 5 segundos
    if (this.currentUserId) {
      this.pollInterval = setInterval(() => {
        this.loadNotifications();
      }, 5000);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cargar notificaciones desde localStorage
   */
  private loadNotifications(): void {
    // Intentar cargar del backend si disponible
    if (this.currentUserId) {
      this.http.get<any[]>(`${this.apiUrl}/`).subscribe({
        next: (data) => {
          const notifications: Notification[] = (data || []).map(d => this.normalizeBackendNotification(d));
          this.notifications$.next(notifications);
          this.updateUnreadCount();
        },
        error: (e) => {
          console.error('[NotificationService] Error loading from backend, falling back to localStorage', e);
          this.loadFromLocalStorage();
        }
      });
    } else {
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('app_notifications');
    if (stored) {
      try {
        const notifications: Notification[] = JSON.parse(stored);
        // Convertir fecha de string a Date si es necesario
        notifications.forEach(n => {
          if (typeof n.fecha === 'string') {
            n.fecha = new Date(n.fecha);
          }
        });
        this.notifications$.next(notifications);
        this.updateUnreadCount();
      } catch (e) {
        console.error('Error loading notifications from localStorage', e);
      }
    }
  }

  private normalizeBackendNotification(raw: any): Notification {
    return {
      id: String(raw.id),
      userId: raw.recipientId || 0,
      type: raw.tipo,
      titulo: raw.titulo,
      mensaje: raw.mensaje,
      icon: raw.icono || 'fa-bell',
      leida: raw.leida || false,
      fecha: new Date(raw.creada),
      data: { ticketId: raw.ticket_id, ...raw.data_json }
    };
  }

  /**
   * Guardar notificaciones en localStorage
   */
  private saveNotifications(): void {
    const notifications = this.notifications$.value;
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }

  /**
   * Actualizar contador de no leídas
   */
  private updateUnreadCount(): void {
    const unread = this.notifications$.value.filter(n => !n.leida).length;
    this.unreadCount$.next(unread);
  }

  /**
   * Crear una nueva notificación (legacy, local)
   */
  addNotification(notification: Omit<Notification, 'id' | 'fecha' | 'leida'>): void {
    const newNotif: Notification = {
      ...notification,
      id: this.generateId(),
      leida: false,
      fecha: new Date()
    };

    const current = this.notifications$.value;
    // Añadir al principio (más nueva primero)
    this.notifications$.next([newNotif, ...current]);
    this.saveNotifications();
    this.updateUnreadCount();
  }

  /**
   * Obtener todas las notificaciones del usuario actual
   */
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable().pipe(
      map(notifs => notifs.filter(n => {
        // Direct recipient by userId
        if (typeof n.userId === 'number' && this.currentUserId !== null && n.userId === this.currentUserId) return true;
        // Role-targeted notifications (preferred over legacy broadcast)
        if ((n as any).targetRole && this.currentUserRole && (n as any).targetRole === this.currentUserRole) return true;
        // Legacy broadcast (userId === 0 and no specific targetRole) — keep for compatibility
        if (n.userId === 0 && !(n as any).targetRole) return true;
        return false;
      }))
    );
  }

  /**
   * Obtener contador de no leídas
   */
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  /**
   * Marcar una notificación como leída
   */
  markAsRead(notificationId: string): void {
    const notifications = this.notifications$.value.map(n =>
      n.id === notificationId ? { ...n, leida: true } : n
    );
    this.notifications$.next(notifications);
    this.saveNotifications();
    this.updateUnreadCount();

    // Sincronizar con backend si disponible
    if (notificationId && !isNaN(Number(notificationId))) {
      this.http.patch(`${this.apiUrl}/${notificationId}/marcar_leida/`, {}).subscribe({
        error: (e) => console.error('[NotificationService] Error marking as read on backend', e)
      });
    }
  }

  /**
   * Marcar todas como leídas
   */
  markAllAsRead(): void {
    const notifications = this.notifications$.value.map(n => ({ ...n, leida: true }));
    this.notifications$.next(notifications);
    this.saveNotifications();
    this.updateUnreadCount();

    // Sincronizar con backend si disponible
    this.http.patch(`${this.apiUrl}/marcar_todas_leidas/`, {}).subscribe({
      error: (e) => console.error('[NotificationService] Error marking all as read on backend', e)
    });
  }

  /**
   * Eliminar una notificación
   */
  deleteNotification(notificationId: string): void {
    const notifications = this.notifications$.value.filter(n => n.id !== notificationId);
    this.notifications$.next(notifications);
    this.saveNotifications();
    this.updateUnreadCount();

    // Sincronizar con backend si disponible
    if (notificationId && !isNaN(Number(notificationId))) {
      this.http.delete(`${this.apiUrl}/${notificationId}/`).subscribe({
        error: (e) => console.error('[NotificationService] Error deleting on backend', e)
      });
    }
  }

  /**
   * Limpiar todas las notificaciones
   */
  clearAll(): void {
    this.notifications$.next([]);
    this.saveNotifications();
    this.updateUnreadCount();
  }

  /**
   * Crear notificación de "Ticket Asignado" (para agentes)
   */
  notifyTicketAssigned(agentId: number, ticketId: number, ticketTitulo: string): void {
    // Si el backend nos da un ID numérico del agente, enrutar a ese usuario.
    // Si no (p. ej. agente aún no resuelto), marcar como targetRole 'agente' para que sólo los agentes lo vean.
    if (agentId && agentId > 0) {
      this.addNotification({
        userId: agentId,
        type: 'ticket_assigned',
        titulo: 'Nuevo Ticket Asignado',
        mensaje: `Se te ha asignado un nuevo ticket: "${ticketTitulo}"`,
        icon: 'fa-ticket',
        data: { ticketId }
      });
    } else {
      this.addNotification({
        userId: 0,
        targetRole: 'agente',
        type: 'ticket_assigned',
        titulo: 'Nuevo Ticket Asignado',
        mensaje: `Se asignó un nuevo ticket: "${ticketTitulo}"`,
        icon: 'fa-ticket',
        data: { ticketId }
      } as any);
    }
  }

  /**
   * Crear notificación de "Respuesta en Ticket" (para usuario/agente)
   */
  notifyTicketResponse(userId: number, ticketId: number, ticketTitulo: string, respondedBy: string, targetRole?: 'usuario' | 'agente'): void {
    // Si se proporciona un userId válido, notificar a ese usuario.
    // Si no (userId === 0) y se indica targetRole, publicar la notificación dirigida a ese rol.
    if (userId && userId > 0) {
      this.addNotification({
        userId: userId,
        type: 'ticket_response',
        titulo: 'Nueva Respuesta',
        mensaje: `${respondedBy} respondió a tu ticket: "${ticketTitulo}"`,
        icon: 'fa-envelope-open',
        data: { ticketId }
      });
    } else if (targetRole) {
      this.addNotification({
        userId: 0,
        targetRole: targetRole,
        type: 'ticket_response',
        titulo: 'Nueva Respuesta',
        mensaje: `${respondedBy} respondió a tu ticket: "${ticketTitulo}"`,
        icon: 'fa-envelope-open',
        data: { ticketId }
      } as any);
    } else {
      // Legacy behavior: broadcast to everyone (kept for compatibility)
      this.addNotification({
        userId: 0,
        type: 'ticket_response',
        titulo: 'Nueva Respuesta',
        mensaje: `${respondedBy} respondió a tu ticket: "${ticketTitulo}"`,
        icon: 'fa-envelope-open',
        data: { ticketId }
      });
    }
  }

  /**
   * Crear notificación de "Ticket Cerrado"
   */
  notifyTicketClosed(userId: number, ticketId: number, ticketTitulo: string): void {
    // Si recibimos un userId válido, notificar a ese usuario; si es 0/undefined, notificar a los usuarios (propietarios)
    if (userId && userId > 0) {
      this.addNotification({
        userId: userId,
        type: 'ticket_closed',
        titulo: 'Ticket Cerrado',
        mensaje: `El ticket "${ticketTitulo}" ha sido cerrado`,
        icon: 'fa-check-circle',
        data: { ticketId }
      });
    } else {
      this.addNotification({
        userId: 0,
        targetRole: 'usuario',
        type: 'ticket_closed',
        titulo: 'Ticket Cerrado',
        mensaje: `El ticket "${ticketTitulo}" ha sido cerrado`,
        icon: 'fa-check-circle',
        data: { ticketId }
      } as any);
    }
  }

  /**
   * Crear notificación de "Nuevo Usuario Registrado" (para admins)
   */
  notifyNewUserRegistered(adminId: number, userName: string, userEmail: string, userRole: string): void {
    // Si hay un adminId específico, notificar a ese admin; si no, notificar sólo a los admins (targetRole)
    if (adminId && adminId > 0) {
      this.addNotification({
        userId: adminId,
        type: 'user_registered',
        titulo: 'Nuevo Usuario Registrado',
        mensaje: `Se registró un nuevo ${userRole}: ${userName} (${userEmail})`,
        icon: 'fa-user-plus',
        data: { userName, userEmail, userRole }
      });
    } else {
      this.addNotification({
        userId: 0,
        targetRole: 'admin',
        type: 'user_registered',
        titulo: 'Nuevo Usuario Registrado',
        mensaje: `Se registró un nuevo ${userRole}: ${userName} (${userEmail})`,
        icon: 'fa-user-plus',
        data: { userName, userEmail, userRole }
      } as any);
    }
  }
}
