import { Component, OnInit } from '@angular/core';
import { AdminStatsService } from '../../../../services/admin-stats.service';

@Component({
  selector: 'app-chart-pie',
  template: `
    <div class="chart-card">
      <h4>Tickets por categoría</h4>
      <div *ngIf="!data.length" class="placeholder">Cargando…</div>
      <ul *ngIf="data.length" class="category-list">
        <li *ngFor="let d of data">
          <span class="cat">{{d.category}}</span>
          <span class="bar" [style.width.%]="(d.count / total * 100)"></span>
          <span class="val">{{d.count}}</span>
        </li>
      </ul>
    </div>
  `,
  styles: [`.chart-card{background:#fff;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)} .placeholder{height:180px;display:flex;align-items:center;justify-content:center;color:#8b88a8} .category-list{list-style:none;padding:0;margin:0} .category-list li{display:flex;align-items:center;gap:8px;padding:6px 0}.bar{height:10px;background:linear-gradient(90deg,#6a11cb,#9b4dff);display:inline-block;border-radius:6px;flex:1}.cat{width:120px;font-weight:600}.val{width:50px;text-align:right;font-weight:700}`]
})
export class ChartPieComponent implements OnInit {
  data: Array<{ category: string, count: number }> = [];
  total = 0;

  constructor(private stats: AdminStatsService) {}

  ngOnInit(): void {
    this.stats.getAllStats().subscribe({ next: (res) => {
      const cat = (res && res.by_category) ? res.by_category : [];
      this.data = Array.isArray(cat) ? cat : (cat.results || []);
      // order by count desc
      this.data.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
      this.total = this.data.reduce((s:any, r:any) => s + (r.count || 0), 0);
    }, error: () => {
      // fallback
      this.stats.getTicketsByCategory().subscribe({ next: (res2) => {
        this.data = Array.isArray(res2) ? res2 : (res2.results || []);
        this.data.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
        this.total = this.data.reduce((s:any, r:any) => s + (r.count || 0), 0);
      }, error: () => {} });
    } });
  }
}
