import { Component, OnInit } from '@angular/core';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-chart-users-svg-pie',
  template: `
    <div class="pie-card">
      <h4>Usuarios (circular)</h4>
      <div *ngIf="!slices.length" class="placeholder">Cargando…</div>
      <div *ngIf="slices.length" class="pie-wrap">
        <svg [attr.viewBox]="viewBox" class="pie-svg" role="img" aria-label="Usuarios por rol">
          <g [attr.transform]="'translate(' + cx + ',' + cy + ')'">
            <g *ngFor="let s of slices; let i = index">
              <path [attr.d]="s.d" [attr.fill]="colors[i % colors.length]" stroke="#fff" stroke-width="1"></path>
            </g>
            <!-- center label -->
            <text *ngIf="total" x="0" y="4" text-anchor="middle" class="center-label">{{total}}</text>
          </g>
        </svg>
        <ul class="legend">
          <li *ngFor="let s of slices; let i = index">
            <span class="swatch" [style.background]="colors[i % colors.length]"></span>
            <span class="lbl">{{s.label}}</span>
            <span class="val">{{s.count}} ({{s.pct}}%)</span>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .pie-card{background:#fff;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.06)}
    .placeholder{height:140px;display:flex;align-items:center;justify-content:center;color:#8b88a8}
    .pie-wrap{display:flex;gap:12px;align-items:center}
    .pie-svg{width:200px;height:200px}
    .legend{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
    .legend li{display:flex;align-items:center;gap:8px}
    .swatch{width:14px;height:14px;border-radius:3px}
    .lbl{font-weight:600;width:80px}
    .val{color:#555;margin-left:8px}
    .center-label{font-size:20px;font-weight:700;fill:#333}
  `]
})
export class ChartUsersSvgPieComponent implements OnInit {
  slices: Array<{ d: string, label: string, count: number, pct: number }> = [];
  total = 0;

  // svg layout
  cx = 100;
  cy = 100;
  radius = 80;
  viewBox = '0 0 200 200';

  colors = ['#6a11cb', '#9b4dff', '#ff8a00', '#ffd166', '#00c2ff'];

  constructor(private usuarios: UsuariosService) {}

  ngOnInit(): void {
    this.usuarios.obtenerUsuariosAgregados().subscribe({ next: (res) => {
      const users = Array.isArray(res) ? res : (res.results || []);
      const counts: Record<string, number> = {};
      users.forEach((u: any) => {
        const r = (u.rol || 'usuario').toString();
        counts[r] = (counts[r] || 0) + 1;
      });
      const rows = Object.keys(counts).map(k => ({ key: k, label: this.labelForRole(k), count: counts[k] }));
      this.total = rows.reduce((s, r) => s + r.count, 0);
      this.buildSlices(rows);
    }, error: () => {
      this.slices = [];
      this.total = 0;
    } });
  }

  labelForRole(role: string) {
    if (role === 'admin' || role === 'administrador') return 'Admin';
    if (role === 'agente') return 'Agente';
    if (role === 'usuario') return 'Usuario';
    return role;
  }

  buildSlices(rows: Array<{ key:string,label:string,count:number }>) {
    if (!rows.length) { this.slices = []; return; }
    // sort desc
    rows.sort((a,b) => b.count - a.count);
    let startAngle = 0; // degrees
    this.slices = rows.map(r => {
      const pct = Math.round((r.count / Math.max(this.total,1)) * 100);
      const angle = (r.count / Math.max(this.total,1)) * 360;
      const endAngle = startAngle + angle;
      const d = this.describeArc(0, 0, this.radius, startAngle, endAngle);
      startAngle = endAngle;
      return { d, label: r.label, count: r.count, pct };
    });
  }

  // SVG arc helpers
  polarToCartesian(centerX:number, centerY:number, radius:number, angleInDegrees:number) {
    const angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  describeArc(x:number, y:number, radius:number, startAngle:number, endAngle:number) {
    const start = this.polarToCartesian(x, y, radius, endAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    const d = [
      `M 0 0`,
      `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
      `Z`
    ].join(' ');
    return d;
  }
}
