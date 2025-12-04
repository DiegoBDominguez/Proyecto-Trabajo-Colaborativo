import { Component, OnInit, OnDestroy } from '@angular/core';
import { Ticket } from '../../../models/ticket.model';
import { TicketService } from '../../../services/ticket.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mis-tickets',
  templateUrl: './mis-tickets.component.html', 
  styleUrls: ['./mis-tickets.component.scss']      
})
export class MisTicketsComponent implements OnInit, OnDestroy {
  tickets: Ticket[] = [];
  sub: Subscription | undefined;

  constructor(private ticketService: TicketService, private router: Router) {}

  ngOnInit(): void {
   // 1) suscríbete (esto pinta la tabla cuando cambie el store)
  this.sub = this.ticketService.getAll$().subscribe(data => {
    console.log('[MisTickets] data =>', data); // 👈 mira qué llega
    // Mostrar solo tickets activos (no mostrar Cerrado)
    this.tickets = Array.isArray(data) ? data.filter(t => t.estado !== 'Cerrado') : [];
  });

  // 2) fuerza un GET cada vez que entras a la pantalla
  this.ticketService.reload();
  }

  // Navegar al detalle completo del ticket
  verEstado(ticket: Ticket) {
    this.router.navigate(['/inicio-usuario/ticket', ticket.id]);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  crearTicket() {
    this.router.navigate(['/inicio-usuario/crear-ticket']);
  }

  borrar(id: number) {
    if (confirm('¿Eliminar este ticket?')) {
      this.ticketService.delete(id);
    }
  }

  formatoFecha(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  descargarArchivo(ticket: Ticket) {
    if (!ticket.archivoDataUrl || !ticket.archivoName) {
      alert('No hay archivo adjunto.');
      return;
    }
    const a = document.createElement('a');
    a.href = ticket.archivoDataUrl;
    a.download = ticket.archivoName;
    a.click();
    a.remove();
  }
}
