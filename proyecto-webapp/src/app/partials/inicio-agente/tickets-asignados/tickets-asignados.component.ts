// src/app/partials/inicio-agente/tickets-asignados/tickets-asignados.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { Subscription } from 'rxjs';

interface Ticket {
  id: number;
  descripcion: string;
  titulo?: string | null;
  categoria: string;
  prioridad: string;
  estado: 'Nuevo' | 'Abierto' | 'Respondido' | 'En Proceso' | 'Cerrado';
  responsable: string;
  fecha: string;
  usuarioNombre: string;     // ← NUEVO: para mostrar en el chat
  noLeidos?: number;         // ← NUEVO: para el puntito rojo en el chat
}

@Component({
  selector: 'app-tickets-asignados',
  templateUrl: './tickets-asignados.component.html',
  styleUrls: ['./tickets-asignados.component.scss']
})
export class TicketsAsignadosComponent implements OnInit, OnDestroy {
  tickets: Ticket[] = [];
  private sub: Subscription | null = null;

  constructor(private router: Router, private ticketService: TicketService) {}

  ngOnInit() {
    // Cargar tickets asignados desde la API
    this.sub = this.ticketService.getAssignedTickets().subscribe({
      next: (data) => {
        // El backend devuelve un array de tickets
        // Filtrar solo los tickets que NO están cerrados
        const allTickets = Array.isArray(data) ? data as Ticket[] : [];
        this.tickets = allTickets.filter(t => t.estado !== 'Cerrado');
        this.actualizarChatFlotanteConEstaLista();
      },
      error: (e) => {
        console.error('[TicketsAsignados] error cargando tickets asignados', e);
      }
    });
  }

  viewTicket(id: number) {
    this.router.navigate(['/inicio-agente/ticket', id]);
  }

  estadoClass(estado?: string) {
    switch (estado) {
      case 'Nuevo': return 'estado-nuevo';
      case 'Enviado': return 'estado-nuevo';
      case 'Respondido': return 'estado-respondido';
      case 'Abierto': return 'estado-abierto';
      case 'En Proceso': return 'estado-en-proceso';
      case 'Cerrado': return 'estado-cerrado';
      default: return '';
    }
  }

  deleteTicket(id: number) {
    if (!confirm(`¿Eliminar el ticket #${id}?`)) return;

    this.ticketService.deleteTicket(id).subscribe({
      next: () => {
        this.tickets = this.tickets.filter(t => t.id !== id);
        const agenteRoot = (window as any).agenteComponent;
        if (agenteRoot?.conversaciones) {
          agenteRoot.conversaciones = agenteRoot.conversaciones.filter((c: any) => c.ticketId !== id);
        }
      },
      error: (e) => console.error('[TicketsAsignados] error eliminando ticket', e)
    });
    
  }

  // ESTO HACE QUE EL CHAT FLOTANTE TENGA EXACTAMENTE LOS MISMOS DATOS
  private actualizarChatFlotanteConEstaLista() {
    const agenteRoot = (window as any).agenteComponent;
    if (agenteRoot) {
      agenteRoot.conversaciones = this.tickets.map(t => ({
        ticketId: t.id,
        usuarioNombre: t.usuarioNombre,
        asunto: t.titulo || t.descripcion,
        mensajes: [], // se llenarán al abrir el detalle o con backend
        noLeidos: t.noLeidos || 0
      }));
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
