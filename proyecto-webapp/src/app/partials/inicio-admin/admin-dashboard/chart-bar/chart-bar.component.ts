import { Component, OnInit } from '@angular/core';
import { AdminStatsService } from '../../../../services/admin-stats.service';

@Component({
  selector: 'app-chart-bar',
  template: `
    <div class="chart-card">
      <h4>Abiertos vs Cerrados</h4>
      <div class="bars">
        <div class="bar-row"><span class="label">Abiertos</span><div class="bar-bg"><div class="bar-open" [style.width.%]="openPct"></div></div><span class="val">{{open}}</span></div>
        <div class="bar-row"><span class="label">Cerrados</span><div class="bar-bg"><div class="bar-closed" [style.width.%]="closedPct"></div></div><span class="val">{{closed}}</span></div>
      </div>
    </div>
  `,
  styles: [`.chart-card{background:#fff;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)} .bars{display:flex;flex-direction:column;gap:12px}.bar-row{display:flex;align-items:center;gap:8px}.label{width:80px;font-weight:700}.bar-bg{flex:1;background:#f1f0fb;border-radius:8px;height:14px;position:relative}.bar-open{background:linear-gradient(90deg,#ffd166,#ff8a00);height:100%;border-radius:8px}.bar-closed{background:linear-gradient(90deg,#9b4dff,#6a11cb);height:100%;border-radius:8px}.val{width:60px;text-align:right;font-weight:700}`]
})
export class ChartBarComponent implements OnInit {
  open = 0;
  closed = 0;
  openPct = 0;
  closedPct = 0;

  constructor(private stats: AdminStatsService) {}

  ngOnInit(): void {
    this.stats.getAllStats().subscribe({ next: (res) => {
      const t = (res && res.tickets) ? res.tickets : null;
      if (t) {
        this.open = t.open || 0;
        this.closed = t.closed || 0;
      }
      const total = Math.max(this.open + this.closed, 1);
      this.openPct = Math.round((this.open / total) * 100);
      this.closedPct = Math.round((this.closed / total) * 100);
    }, error: () => {
      // fallback to individual endpoint
      this.stats.getOpenClosedCounts().subscribe({ next: (res2) => {
        this.open = (res2 && res2.open) || 0;
        this.closed = (res2 && res2.closed) || 0;
        const total2 = Math.max(this.open + this.closed, 1);
        this.openPct = Math.round((this.open / total2) * 100);
        this.closedPct = Math.round((this.closed / total2) * 100);
      }, error: () => {} });
    } });
  }
}
