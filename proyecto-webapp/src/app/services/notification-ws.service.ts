import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

export interface NotificationMessage {
  type: string;
  id?: string;
  titulo?: string;
  ticket_id?: number;
  notification?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationWsService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingTimer: any;
  private reconnectTimer: any;
  
  public notificationReceived$ = new Subject<NotificationMessage>();
  public connectionStatus$ = new Subject<'connected' | 'disconnected' | 'error'>();

  constructor(private authService: AuthService) {}

  /**
   * Conecta al WebSocket de notificaciones
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[NotificationWsService] Ya está conectado');
      return; // Ya conectado
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('[NotificationWsService] No token available, skipping WebSocket connection');
      return;
    }

    // Construir la URL de WS a partir de la configuración del backend (en dev el API puede correr en otro puerto)
    try {
      const apiUrl = environment.apiUrl; // e.g. http://127.0.0.1:8001/api/cuentas
      const u = new URL(apiUrl);
      const protocol = u.protocol === 'https:' ? 'wss' : 'ws';
      const host = u.host; // incluye puerto
      const basePath = u.pathname.replace(/\/$/, '');
      // Endpoint WS esperado en backend: /ws/notifications/
      const wsUrl = `${protocol}://${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
      console.log('[NotificationWsService] Intentando conectar a:', wsUrl);

      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      // Fallback: intentar con window.location (prod scenario)
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const wsUrl = `${protocol}://${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
      console.warn('[NotificationWsService] Error construyendo WS desde environment, usando window.location:', err);
      console.log('[NotificationWsService] Intentando conectar a (fallback):', wsUrl);
      this.ws = new WebSocket(wsUrl);
    }

    try {
      this.ws.onopen = () => {
        console.log('[NotificationWsService] WebSocket conectado exitosamente');
        this.reconnectAttempts = 0;
        this.connectionStatus$.next('connected');
        this.sendPing();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('[NotificationWsService] Mensaje recibido:', event.data);
          const message: NotificationMessage = JSON.parse(event.data);
          this.notificationReceived$.next(message);
        } catch (e) {
          console.error('[NotificationWsService] Error parsing message', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[NotificationWsService] WebSocket error:', error);
        this.connectionStatus$.next('error');
      };

      this.ws.onclose = () => {
        console.log('[NotificationWsService] WebSocket cerrado, intentando reconectar...');
        this.connectionStatus$.next('disconnected');
        this.attemptReconnect();
      };
    } catch (e) {
      console.error('[NotificationWsService] Error creating WebSocket', e);
      this.connectionStatus$.next('error');
      this.attemptReconnect();
    }
  }

  /**
   * Intenta reconectar al WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[NotificationWsService] Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${this.reconnectDelay}ms`);
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.warn('[NotificationWsService] Máximo de intentos de reconexión alcanzado');
      this.connectionStatus$.next('error');
    }
  }

  /**
   * Envía un ping al servidor para mantener la conexión viva
   */
  private sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'ping' }));
      console.log('[NotificationWsService] Ping enviado');
      // Ping cada 30 segundos
      this.pingTimer = setTimeout(() => this.sendPing(), 30000);
    }
  }

  /**
   * Marca una notificación como leída por WebSocket
   */
  markAsRead(notificationId: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'mark_read', notification_id: notificationId }));
    }
  }

  /**
   * Desconecta del WebSocket
   */
  disconnect(): void {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
