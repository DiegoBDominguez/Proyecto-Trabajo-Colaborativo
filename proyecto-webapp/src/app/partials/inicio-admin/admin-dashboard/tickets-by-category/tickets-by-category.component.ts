import { Component, OnInit } from '@angular/core';
import { AdminStatsService } from '../../../../services/admin-stats.service';

@Component({
  selector: 'app-tickets-by-category',
  templateUrl: './tickets-by-category.component.html',
  styleUrls: ['./tickets-by-category.component.scss']
})
export class TicketsByCategoryComponent implements OnInit {
  data: Array<{ category: string, count: number }> = [];
  loading = false;

  constructor(private stats: AdminStatsService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.stats.getTicketsByCategory().subscribe({ next: (res) => {
      // expect res to be array [{ category: 'X', count: 12 }]
      this.data = Array.isArray(res) ? res : (res.results || []);
      this.loading = false;
    }, error: (e) => { console.error('tickets by category error', e); this.loading = false; } });
  }
}
