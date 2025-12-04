import { Component, OnInit } from '@angular/core';
import { AdminStatsService } from '../../../../services/admin-stats.service';

@Component({
  selector: 'app-chart-line',
  template: `
    <div class="chart-card">
      <h4>Actividad (últimos días)</h4>
      <svg *ngIf="points.length" [attr.viewBox]="viewBox" class="sparkline">
        <polyline [attr.points]="pointsStr" fill="none" stroke="#6a11cb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <div *ngIf="!points.length" class="placeholder">Cargando...</div>
    </div>
  `,
  styles: [`.chart-card{background:#fff;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)} .placeholder{height:180px;display:flex;align-items:center;justify-content:center;color:#8b88a8} .sparkline{width:100%;height:180px}`]
})
export class ChartLineComponent implements OnInit {
  points: Array<[number,number]> = [];
  pointsStr = '';
  viewBox = '0 0 100 40';

  constructor(private stats: AdminStatsService) {}

  ngOnInit(): void {
    // prefer the combined endpoint for fewer requests
    this.stats.getAllStats().subscribe({ next: (res) => {
      const series = (res && res.trend) ? res.trend : [];
      if (!series.length) return;
      const counts = series.map((s: any) => s.count || 0);
      const max = Math.max(...counts, 1);
      const step = 100 / Math.max(counts.length - 1, 1);
      this.points = counts.map((c: number, i: number) => [i * step, 40 - (c / max) * 36]);
      this.pointsStr = this.points.map(p => p.join(',')).join(' ');
    }, error: () => {
      // fallback to individual endpoint
      this.stats.getTicketsTrend().subscribe({ next: (res2) => {
        const series2 = Array.isArray(res2) ? res2 : (res2.data || []);
        if (!series2.length) return;
        const counts = series2.map((s: any) => s.count || 0);
        const max = Math.max(...counts, 1);
        const step = 100 / Math.max(counts.length - 1, 1);
        this.points = counts.map((c: number, i: number) => [i * step, 40 - (c / max) * 36]);
        this.pointsStr = this.points.map(p => p.join(',')).join(' ');
      }, error: () => {} });
    } });
  }
}
