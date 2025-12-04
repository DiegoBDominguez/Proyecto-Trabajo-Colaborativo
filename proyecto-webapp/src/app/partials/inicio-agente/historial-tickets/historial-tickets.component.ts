// src/app/partials/inicio-agente/historial-tickets/historial-tickets.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

interface Ticket {
  id: number;
  titulo?: string | null;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  responsable: string;
  fecha: string;
  usuarioNombre?: string;
  usuario_email?: string;
  usuario_nombre?: string;
  folio_agente?: number;
}

@Component({
  selector: 'app-historial-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-tickets.component.html',
  styleUrls: ['./historial-tickets.component.scss']
})
export class HistorialTicketsComponent implements OnInit, OnDestroy {
  tickets: Ticket[] = [];
  private sub: Subscription | undefined;
  private navSub: Subscription | undefined;
  loading = false;

  constructor(
    private ticketService: TicketService,
    private router: Router
  ) {}

  ngOnInit() {
    // Cargar inicial
    this.cargarTicketsCerrados();

    // Recargar cada vez que vuelvas a esta ruta (después de cerrar un ticket)
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/inicio-agente/historial-tickets') {
          console.log('[HistorialTickets] Recargando historial...');
          this.cargarTicketsCerrados();
        }
      });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.navSub?.unsubscribe();
  }

  cargarTicketsCerrados() {
    this.loading = true;
    // Cargar todos los tickets del agente y filtrar por estado 'Cerrado'
    this.sub = this.ticketService.getAssignedTickets().subscribe({
      next: (todos: any[]) => {
        this.tickets = todos.filter(t => t.estado === 'Cerrado');
        this.loading = false;
      },
      error: (e) => {
        console.error('[HistorialTickets] error cargando tickets', e);
        this.loading = false;
      }
    });
  }

  verDetalles(ticket: Ticket) {
    // La ruta de detalle usada en el resto de la app es '/inicio-agente/ticket/:id'
    // Navegar con la misma ruta evita redirecciones inesperadas por guards
    this.router.navigate(['/inicio-agente/ticket', ticket.id]);
  }

  formatoFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  estadoClass(estado?: string): string {
    if (!estado) return '';
    switch (estado) {
      case 'Cerrado': return 'estado-cerrado';
      case 'Respondido': return 'estado-respondido';
      case 'En Proceso': return 'estado-en-proceso';
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
}