import { Component, OnInit } from '@angular/core';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-chart-users-pie',
  template: `
    <div class="chart-card">
      <h4>Gráfica de Usuarios</h4>
      <div *ngIf="!data.length" class="placeholder">Cargando…</div>
      <ul *ngIf="data.length" class="category-list">
        <li *ngFor="let d of data">
          <span class="cat">{{d.label}}</span>
          <div class="bar-wrap" aria-hidden="true">
            <span class="bar-fill" [style.width.%]="d.pctDisplay" [attr.title]="d.count + ' usuarios (' + d.pctDisplay + '%)'"></span>
          </div>
          <span class="val">{{d.count}} ({{d.pctDisplay}}%)</span>
        </li>
      </ul>
      <div class="note">Total: {{total}}</div>
    </div>
  `,
  styles: [`.chart-card{background:#fff;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)} .placeholder{height:140px;display:flex;align-items:center;justify-content:center;color:#8b88a8} .category-list{list-style:none;padding:0;margin:0} .category-list li{display:flex;align-items:center;gap:12px;padding:8px 0}.cat{width:120px;font-weight:600}.bar-wrap{flex:1;background:#f1f0fb;border-radius:8px;height:12px;position:relative;overflow:hidden}.bar-fill{display:block;height:100%;background:linear-gradient(90deg,#6a11cb,#9b4dff);border-radius:8px;transition:width .4s ease}.val{width:90px;text-align:right;font-weight:700}.note{margin-top:8px;color:#666;font-size:12px}`]
})
export class ChartUsersPieComponent implements OnInit {
  data: Array<{ label: string, count: number, pctDisplay: number }> = [];
  total = 0;

  constructor(private usuarios: UsuariosService) {}

  ngOnInit(): void {
    // Fetch aggregated users and compute counts by role
    this.usuarios.obtenerUsuariosAgregados().subscribe({ next: (res) => {
      const users = Array.isArray(res) ? res : (res.results || []);
      const counts: Record<string, number> = {};
      users.forEach((u: any) => {
        const r = (u.rol || 'usuario').toString();
        counts[r] = (counts[r] || 0) + 1;
      });
      // ensure known roles order
      const rows = Object.keys(counts).map(k => ({ label: k, count: counts[k] }));
      this.total = rows.reduce((s, r) => s + r.count, 0);
      // compute percent display and sort desc
      this.data = rows.map(r => ({ label: this.labelForRole(r.label), count: r.count, pctDisplay: Math.round((r.count / Math.max(this.total,1)) * 100) })).sort((a,b) => b.count - a.count);
    }, error: () => {
      // fallback empty
      this.data = [];
      this.total = 0;
    } });
  }

  labelForRole(role: string) {
    if (role === 'admin' || role === 'administrador') return 'Admin';
    if (role === 'agente') return 'Agente';
    if (role === 'usuario') return 'Usuario';
    return role;
  }
}
