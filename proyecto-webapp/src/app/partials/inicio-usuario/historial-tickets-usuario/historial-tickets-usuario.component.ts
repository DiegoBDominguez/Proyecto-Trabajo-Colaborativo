// src/app/partials/inicio-usuario/historial-tickets-usuario/historial-tickets-usuario.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TicketService } from '../../../services/ticket.service';

interface Ticket {
  id: number;
  titulo?: string | null;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  responsable: string;
  fecha: string;
  folio_usuario?: number;
  archivoName?: string | null;
}

@Component({
  selector: 'app-historial-tickets-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-tickets-usuario.component.html',
  styleUrls: ['./historial-tickets-usuario.component.scss']
})
export class HistorialTicketsUsuarioComponent implements OnInit, OnDestroy {
  tickets: Ticket[] = [];
  loading = false;
  private sub: Subscription | undefined;
  private navSub: Subscription | undefined;

  constructor(private ticketService: TicketService, private router: Router) {}

  ngOnInit() {
    this.cargarHistorial();

    // Recargar cada vez que vuelves a esta ruta (después de ver detalles o cerrar ticket)
    this.navSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/inicio-usuario/historial-tickets') {
          console.log('[HistorialUsuario] Recargando historial...');
          this.cargarHistorial();
        }
      });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.navSub?.unsubscribe();
  }

  cargarHistorial() {
    this.loading = true;
    console.log('[HistorialUsuario] Iniciando carga de historial...');
    
    // Forzar recarga desde servidor (no usar cache)
    this.ticketService.reload();
    
    this.sub = this.ticketService.getAll$().subscribe({
      next: (all: any[]) => {
        console.log('[HistorialUsuario] Tickets recibidos del servidor:', all);
        console.log('[HistorialUsuario] Total de tickets:', all?.length);
        
        // Filtrar solo los tickets cerrados del usuario logueado
        const cerrados = Array.isArray(all) ? all.filter(t => t.estado === 'Cerrado') : [];
        console.log('[HistorialUsuario] Tickets cerrados después de filtrar:', cerrados);
        
        this.tickets = cerrados;
        this.loading = false;
      },
      error: (e) => {
        console.error('[HistorialUsuario] error cargando tickets', e);
        this.loading = false;
      }
    });
  }

  verDetalles(ticket: Ticket) {
    this.router.navigate(['/inicio-usuario/ticket', ticket.id]);
  }

  formatoFecha(fecha: string) {
    return new Date(fecha).toLocaleString();
  }

  getPriorityClass(prioridad: string): string {
    if (!prioridad) return '';
    const p = prioridad.toLowerCase();
    if (p === 'alta') return 'priority-high';
    if (p === 'media') return 'priority-medium';
    if (p === 'baja') return 'priority-low';
    return '';
  }

  estadoClass(estado: string): string {
    if (!estado) return '';
    const e = estado.toLowerCase();
    if (e === 'cerrado') return 'estado-cerrado';
    if (e === 'respondido') return 'estado-respondido';
    if (e === 'en proceso') return 'estado-en-proceso';
    return '';
  }
}