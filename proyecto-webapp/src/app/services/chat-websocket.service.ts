import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { ChatService } from './chat.service';
import { environment } from 'src/environments/environment';

export interface MensajeWS {
  conversacionId?: number;
  texto: string;
  usuario: string;
  esAgente: boolean;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatWebsocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<MensajeWS>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private currentTicketId: number | null = null;

  public messages$ = this.messageSubject.asObservable();
  public isConnected$ = this.connectionStatus.asObservable();

  constructor(private chatService: ChatService) {}

  // Conectar al WebSocket para un ticket específico
  connect(ticketId: number, token: string) {
    // Si ya está conectado a otro ticket, desconecta primero
    if (this.socket && this.currentTicketId !== ticketId) {
      this.disconnect();
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log(`[Chat] Ya conectado al ticket ${ticketId}`);
      return;
    }

    this.currentTicketId = ticketId;
    // Construir URL de WS dinámicamente desde environment
    const apiUrl = environment.apiUrl; // e.g. http://127.0.0.1:8001/api/cuentas o https://diegobd.pythonanywhere.com/api/cuentas
    const u = new URL(apiUrl);
    const protocol = u.protocol === 'https:' ? 'wss' : 'ws';
    const host = u.host; // incluye puerto
    const wsUrl = `${protocol}://${host}/ws/chat/${ticketId}/?token=${token}`;
    
    console.log(`[Chat] Conectando a ${wsUrl}`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[Chat] Conectado al servidor WebSocket');
      this.connectionStatus.next(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          this.messageSubject.next({
            texto: data.mensaje,
            usuario: data.usuario,
            esAgente: data.esAgente,
            fecha: data.fecha,
          });
        }
      } catch (e) {
        console.error('[Chat] Error parseando mensaje:', e);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[Chat] Error WebSocket:', error);
      this.connectionStatus.next(false);
    };

    this.socket.onclose = () => {
      console.log('[Chat] Desconectado del servidor');
      this.connectionStatus.next(false);
      this.currentTicketId = null;
    };
  }

  // Conectar al servicio de chat general (para todas las conversaciones)
  connectToChat(token: string) {
    // Si ya está conectado, no re-conectar
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[ChatService] Ya conectado');
      return;
    }

    // Construir URL de WS dinámicamente desde environment
    const apiUrl = environment.apiUrl; // e.g. http://127.0.0.1:8001/api/cuentas o https://diegobd.pythonanywhere.com/api/cuentas
    const u = new URL(apiUrl);
    const protocol = u.protocol === 'https:' ? 'wss' : 'ws';
    const host = u.host; // incluye puerto
    const wsUrl = `${protocol}://${host}/ws/chat/?token=${token}`;
    
    console.log(`[ChatService] Conectando a ${wsUrl}`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[ChatService] Conectado al servidor WebSocket');
      this.connectionStatus.next(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          const mensaje: MensajeWS = {
            conversacionId: data.conversacionId,
            texto: data.mensaje || data.texto,
            usuario: data.usuario,
            esAgente: data.esAgente,
            fecha: data.fecha,
          };
          
          // Pasar al ChatService para que actualice sus observables
          this.chatService.recibirMensajeEnTiempoReal({
            id: data.id || 0,
            conversacionId: data.conversacionId,
            remitente: data.usuario,
            esAgente: data.esAgente,
            texto: data.mensaje || data.texto,
            fecha: data.fecha,
          });
          
          this.messageSubject.next(mensaje);
        }
      } catch (e) {
        console.error('[ChatService] Error parseando mensaje:', e);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[ChatService] Error WebSocket:', error);
      this.connectionStatus.next(false);
    };

    this.socket.onclose = () => {
      console.log('[ChatService] Desconectado del servidor');
      this.connectionStatus.next(false);
    };
  }

  // Enviar mensaje
  sendMessage(mensaje: string, esAgente: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        mensaje: mensaje,
        esAgente: esAgente,
      }));
      console.log('[Chat] Mensaje enviado:', mensaje);
    } else {
      console.warn('[Chat] WebSocket no está conectado');
    }
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.currentTicketId = null;
    }
  }

  // Obtener estado de conexión
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
