import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ChatService, ConversacionChat, MensajeChat } from 'src/app/services/chat.service';
import { ChatWebsocketService } from 'src/app/services/chat-websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inicio-usuario',
  templateUrl: './inicio-usuario.component.html',
  styleUrls: ['./inicio-usuario.component.scss']
})
export class InicioUsuarioComponent implements OnInit, OnDestroy {

  // ========== MENU LATERAL ==========
  isMenuOpen = true;
  tituloSeccion = '';
  animandoTitulo = false;

  // ========== CHAT ==========
  mostrarChat = false;
  conversaciones: ConversacionChat[] = [];
  conversacionActual: ConversacionChat | null = null;
  mensajes: MensajeChat[] = [];
  mensajeActual = '';
  buscarText = '';
  filteredConversaciones: ConversacionChat[] = [];
  // Use access_token stored by AuthService after login
  token = localStorage.getItem('access_token') || '';

  // ========== MODAL NUEVA CONVERSACIÓN ==========
  mostrarModalNuevaConversacion = false;
  emailAgenteBuscado = '';

  private subConversaciones: Subscription | undefined;
  private subMensajes: Subscription | undefined;
  private subConversacionActual: Subscription | undefined;
  private subNuevoMensaje: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private chatService: ChatService,
    private chatWebsocket: ChatWebsocketService
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

  // ========== MENU ==========
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  cambiarTitulo(titulo: string) {
    this.animandoTitulo = true;
    this.tituloSeccion = titulo;
    setTimeout(() => this.animandoTitulo = false, 500);
  }

  navigateTo(route: string) {
    console.log(`Navegando a: ${route}`);
  }

  // ========== CHAT ==========
  abrirChat() {
    this.mostrarChat = true;
    // Conectar WebSocket para tiempo real
    this.chatWebsocket.connectToChat(this.token);
  }

  cerrarChat() {
    this.mostrarChat = false;
  }

  seleccionarConversacion(conversacion: ConversacionChat) {
    this.chatService.seleccionarConversacion(conversacion);
    // Si el websocket no está conectado, conectar
    if (!this.chatWebsocket.isConnected()) {
      this.chatWebsocket.connectToChat(this.token);
    }
  }

  buscarConversaciones() {
    if (!this.buscarText.trim()) {
      this.filteredConversaciones = this.conversaciones;
      return;
    }

    const query = this.buscarText.toLowerCase();
    this.filteredConversaciones = this.conversaciones.filter(c =>
      c.agentEmail?.toLowerCase().includes(query) ||
      c.agenteName?.toLowerCase().includes(query) ||
      c.ticketAsunto?.toLowerCase().includes(query) ||
      c.ultimoMensaje?.toLowerCase().includes(query)
    );
  }

  iniciarNuevaConversacion() {
    this.mostrarModalNuevaConversacion = true;
    this.emailAgenteBuscado = '';
  }

  cerrarModalNuevaConversacion() {
    this.mostrarModalNuevaConversacion = false;
    this.emailAgenteBuscado = '';
  }

  buscarYCrearConversacion() {
    if (!this.emailAgenteBuscado || this.emailAgenteBuscado.trim() === '') {
      return;
    }

    // Llamar al backend para crear/obtener conversación con el agente
    this.chatService.iniciarConversacionPorEmail(this.emailAgenteBuscado).subscribe({
      next: (nuevaConv) => {
        this.cerrarModalNuevaConversacion();
        this.chatService.recargar();
        this.seleccionarConversacion(nuevaConv);
      },
      error: (e) => {
        console.error('[InicioUsuario] Error iniciando conversación', e);
        alert('No se pudo encontrar o crear la conversación. Verifica que el email sea correcto.');
      }
    });
  }

  enviarMensaje() {
    if (!this.mensajeActual.trim() || !this.conversacionActual) {
      return;
    }

    this.chatService.enviarMensaje(this.conversacionActual.id, this.mensajeActual).subscribe({
      next: (mensaje) => {
        // El mensaje se agregará automáticamente por WebSocket
        this.mensajeActual = '';
      },
      error: (e) => console.error('[InicioUsuario] Error enviando mensaje', e)
    });
  }

  enviarConEnter(event: KeyboardEvent) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.enviarMensaje();
  }

  manejarEnter(event: any) {
    if ((event as KeyboardEvent).shiftKey) return;
    (event as KeyboardEvent).preventDefault();
    this.enviarMensaje();
  }

  private scrollAbajo() {
    const container = document.querySelector('.chat-messages-active') as HTMLElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  ngOnDestroy(): void {
    this.subConversaciones?.unsubscribe();
    this.subMensajes?.unsubscribe();
    this.subConversacionActual?.unsubscribe();
    this.subNuevoMensaje?.unsubscribe();
    this.chatWebsocket.disconnect();
  }

  logout(): void {
    this.authService.logout();
  }
}