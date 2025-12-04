// src/app/partials/inicio-agente/inicio-agente.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatWebsocketService, MensajeWS } from '../../services/chat-websocket.service';
import { ChatService, ConversacionChat, MensajeChat } from 'src/app/services/chat.service';
import { Subscription } from 'rxjs';

interface Mensaje {
  texto: string;
  esAgente: boolean;
  fecha: Date;
}

@Component({
  selector: 'app-inicio-agente',
  templateUrl: './inicio-agente.component.html',
  styleUrls: ['./inicio-agente.component.scss']
})
export class InicioAgenteComponent implements OnInit, OnDestroy {
  isMenuOpen = true;
  animandoTitulo = false;
  tituloSeccion = '';

  // CHAT
  mostrarChat = false;
  conversaciones: ConversacionChat[] = [];
  conversacionActual: ConversacionChat | null = null;
  mensajes: MensajeChat[] = [];
  mensajeActual = '';
  buscarText = '';
  filteredConversaciones: ConversacionChat[] = [];
  token = localStorage.getItem('access_token') || '';

  // Modal nueva conversación
  mostrarModalNuevaConversacion = false;
  emailBuscado = '';
  resultadosBusqueda: Array<{id:number,email:string,username:string,rol:string}> = [];

  private subConversaciones: Subscription | undefined;
  private subMensajes: Subscription | undefined;
  private subConversacionActual: Subscription | undefined;
  private subNuevoMensaje: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private chatWs: ChatWebsocketService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    // Suscribirse a conversaciones
    this.subConversaciones = this.chatService.getConversaciones().subscribe(conv => {
      this.conversaciones = conv.sort((a, b) => 
        new Date(b.ultimaActividad || '').getTime() - new Date(a.ultimaActividad || '').getTime()
      );
      this.filteredConversaciones = this.conversaciones;
    });

    // Suscribirse a mensajes
    this.subMensajes = this.chatService.getMensajes().subscribe(msg => {
      this.mensajes = msg;
      setTimeout(() => this.scrollAbajo(), 100);
    });

    // Suscribirse a conversación actual
    this.subConversacionActual = this.chatService.conversacionActual$.subscribe(conv => {
      this.conversacionActual = conv;
    });

    // Suscribirse a nuevos mensajes en tiempo real
    this.subNuevoMensaje = this.chatService.nuevoMensaje$.subscribe(msg => {
      // Si el mensaje es para la conversación actual, agregar a la lista
      if (msg.conversacionId === this.conversacionActual?.id) {
        this.mensajes = [...this.mensajes, msg];
        setTimeout(() => this.scrollAbajo(), 100);
      }
    });

    // Cargar conversaciones iniciales
    this.chatService.recargar();
  }

  ngOnDestroy(): void {
    this.subConversaciones?.unsubscribe();
    this.subMensajes?.unsubscribe();
    this.subConversacionActual?.unsubscribe();
    this.subNuevoMensaje?.unsubscribe();
    this.chatWs.disconnect();
  }

  // ===================== MENÚ =====================
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  cambiarTitulo(titulo: string) {
    if (this.tituloSeccion !== titulo) {
      this.animandoTitulo = true;
      this.tituloSeccion = titulo;
      setTimeout(() => this.animandoTitulo = false, 500);
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  // ===================== CHAT =====================
  abrirChat() {
    this.mostrarChat = true;
    // Conectar al WS general para recibir conversaciones 1:1
    if (!this.chatWs.isConnected()) {
      this.chatWs.connectToChat(this.token);
    }
    // Limpiar la conversación/mensajes para mostrar bandeja vacía hasta selección
    this.chatService.limpiarConversacionActual();
  }

  cerrarChat() {
    this.mostrarChat = false;
    // Limpiar para evitar que queden mensajes al reabrir
    this.chatService.limpiarConversacionActual();
  }

  buscarConversaciones() {
    if (!this.buscarText.trim()) {
      this.filteredConversaciones = this.conversaciones;
    } else {
      const query = this.buscarText.toLowerCase();
      this.filteredConversaciones = this.conversaciones.filter(conv =>
        (conv.usuarioEmail && conv.usuarioEmail.toLowerCase().includes(query)) ||
        (conv.usuarioName && conv.usuarioName.toLowerCase().includes(query)) ||
        (conv.ultimoMensaje && conv.ultimoMensaje.toLowerCase().includes(query))
      );
    }
  }

  seleccionarConversacion(conv: ConversacionChat) {
    this.chatService.seleccionarConversacion(conv);
    // asegurar conexión al WS general
    if (!this.chatWs.isConnected()) {
      this.chatWs.connectToChat(this.token);
    }
    this.scrollAbajo();
  }

  iniciarNuevaConversacion() {
    this.mostrarModalNuevaConversacion = true;
    this.emailBuscado = '';
    this.resultadosBusqueda = [];
  }

  cerrarModalNuevaConversacion() {
    this.mostrarModalNuevaConversacion = false;
    this.emailBuscado = '';
    this.resultadosBusqueda = [];
  }

  buscarYCrearConversacion() {
    const q = this.emailBuscado?.trim();
    if (!q) return;

    // Buscar coincidencias
    this.chatService.buscarUsuariosPorEmail(q).subscribe({
      next: (res) => {
        this.resultadosBusqueda = res;
        if (res.length === 1) {
          // Si solo hay uno, iniciar directamente
          this.chatService.iniciarConversacionPorEmail(res[0].email).subscribe({
            next: (conv) => {
              this.cerrarModalNuevaConversacion();
              this.chatService.recargar();
              this.seleccionarConversacion(conv);
            },
            error: (e) => alert(e.error?.error || 'No se pudo iniciar conversación')
          });
        }
      },
      error: (e) => {
        console.error('[InicioAgente] Error buscando usuarios', e);
        alert('Error buscando usuarios');
      }
    });
  }

  seleccionarResultadoYCrear(email: string) {
    this.chatService.iniciarConversacionPorEmail(email).subscribe({
      next: (conv) => {
        this.cerrarModalNuevaConversacion();
        this.chatService.recargar();
        this.seleccionarConversacion(conv);
      },
      error: (e) => alert(e.error?.error || 'No se pudo iniciar conversación')
    });
  }

  enviarMensaje() {
    if (!this.mensajeActual.trim() || !this.conversacionActual) return;

    this.chatService.enviarMensaje(this.conversacionActual.id, this.mensajeActual).subscribe({
      next: (m) => {
        this.mensajeActual = '';
      },
      error: (e) => console.error('[InicioAgente] Error enviando mensaje', e)
    });
    this.scrollAbajo();
  }

  manejarEnter(event: any) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.enviarMensaje();
  }

  scrollAbajo() {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages-active') as HTMLElement;
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }

  logout(): void {
    this.authService.logout();
  }
}