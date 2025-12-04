import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { UsuariosService } from '../../../services/usuarios.service';

@Component({
  selector: 'app-admin-users-table',
  templateUrl: './admin-users-table.component.html',
  styleUrls: ['./admin-users-table.component.scss']
})
export class AdminUsersTableComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['avatar','id', 'nombre', 'email', 'rol', 'tickets_total', 'tickets_open', 'tickets_closed', 'fecha_registro', 'ultimo_login', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;

  rolesFilter: string = 'all';
  currentSearch: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.usuariosService.obtenerUsuariosAgregados().subscribe({
      next: (res) => {
        // se espera que el backend devuelva un array de usuarios
        const users = Array.isArray(res) ? res : (res.results || []);
        this.dataSource.data = users;
        setTimeout(() => {
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
        });
        this.loading = false;
      },
      error: (e) => {
        console.error('[AdminUsersTable] error cargando usuarios', e);
        this.loading = false;
      }
    });
  }

  applyRoleFilter() {
    this.rolesFilter = (this.rolesFilter || 'all').toString();
    this.updateFilter();
  }

  applySearch(term: string) {
    this.currentSearch = (term || '').trim().toLowerCase();
    this.updateFilter();
  }

  updateFilter() {
    // combine role and search into a single filter string (JSON) so predicate can evaluate both
    const payload = JSON.stringify({ role: this.rolesFilter || 'all', search: this.currentSearch || '' });
    this.dataSource.filter = payload;
  }

  exportCsv() {
    const rows = this.dataSource.filteredData || this.dataSource.data;
    const headers = ['ID','Nombre','Email','Rol','Tickets Totales','Abiertos','Cerrados','Registro','Últ. login'];
    const csv = [headers.join(',')].concat(rows.map((r: any) => {
      return [r.id, `"${(r.first_name||'') + ' ' + (r.last_name||'') }"`, r.email, r.rol, r.tickets_total||0, r.tickets_open||0, r.tickets_closed||0, r.date_joined || '', r.last_login || ''].join(',');
    })).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Custom filter predicate to filter by role
  ngAfterViewInit() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      if (!filter) return true;
      let f: any = { role: 'all', search: '' };
      try {
        f = JSON.parse(filter);
      } catch {
        // backward compatibility: if plain string provided, treat as search term
        f = { role: 'all', search: (filter || '').toString().toLowerCase() };
      }

      const role = (f.role || 'all').toString().toLowerCase();
      const search = (f.search || '').toString().toLowerCase();

      const roleMatch = role === 'all' || ((data.rol || '').toString().toLowerCase() === role);
      if (!search) return roleMatch;

      const haystack = (`${data.first_name || ''} ${data.last_name || ''} ${data.email || ''} ${data.username || ''}`).toLowerCase();
      return roleMatch && haystack.indexOf(search) !== -1;
    };
  }

  verUsuario(user: any) {
    // abrir detalle o modal
    alert(`Ver usuario: ${user.email}`);
  }

}
