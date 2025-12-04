import { Component, OnInit } from '@angular/core';
import { AdminStatsService } from '../../../../services/admin-stats.service';

@Component({
  selector: 'app-stats-cards',
  templateUrl: './stats-cards.component.html',
  styleUrls: ['./stats-cards.component.scss']
})
export class StatsCardsComponent implements OnInit {
  stats = [
    { key: 'users', title: 'Usuarios', value: 0, hint: 'Total registrados' },
    { key: 'open', title: 'Abiertos', value: 0, hint: 'Tickets abiertos' },
    { key: 'closed', title: 'Cerrados', value: 0, hint: 'Tickets cerrados' },
    { key: 'avg', title: 'Resolución (hrs)', value: 0, hint: 'Tiempo promedio (hrs)'}
  ];

  constructor(private statsService: AdminStatsService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    // use combined endpoint to reduce calls
    this.statsService.getAllStats().subscribe({ next: (res) => {
        if (!res) return;
        this.setStat('users', res.users_total || 0);
        const tickets = res.tickets || {};
        this.setStat('open', tickets.open || 0);
        this.setStat('closed', tickets.closed || 0);
        const avg = res.avg_resolution || {};
        this.setStat('avg', avg.avg_hours || 0);
      }, error: () => {
        // fallback to zeroes on error
        this.setStat('users', 0);
        this.setStat('open', 0);
        this.setStat('closed', 0);
        this.setStat('avg', 0);
      }
    });
  }

  setStat(key: string, value: any) {
    const s = this.stats.find(x => x.key === key);
    if (s) { s.value = value; }
  }
}
