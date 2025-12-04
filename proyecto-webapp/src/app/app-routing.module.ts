// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginScreenComponent } from './screens/login-screen/login-screen.component';
import { RegistroUsuariosScreenComponent } from './screens/registro-usuarios-screen/registro-usuarios-screen.component';
import { RegistroAgentesComponent } from './partials/registro-agentes/registro-agentes.component';
import { RegistroAdminComponent } from './partials/registro-admin/registro-admin.component';
import { RegistroUsuariosComponent } from './partials/registro-usuarios/registro-usuarios.component';
import { PrincipalScreenComponent } from './screens/principal-screen/principal-screen.component';

import { InicioAdminComponent } from './partials/inicio-admin/inicio-admin.component';
import { InicioUsuarioComponent } from './partials/inicio-usuario/inicio-usuario.component';
import { InicioAgenteComponent } from './partials/inicio-agente/inicio-agente.component';

import { MisTicketsComponent } from './partials/inicio-usuario/mis-tickets/mis-tickets.component';
import { CrearTicketComponent } from './partials/inicio-usuario/crear-ticket/crear-ticket.component';
import { EditarPerfilComponent } from './partials/inicio-usuario/editar-perfil/editar-perfil.component';

import { TicketsAsignadosComponent } from './partials/inicio-agente/tickets-asignados/tickets-asignados.component';
import { TicketDetailComponent } from './partials/inicio-agente/ticket-detail/ticket-detail.component';

import { UserTicketDetailComponent } from './partials/inicio-usuario/user-ticket-detail/user-ticket-detail.component';

// 🔐 Guards
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  // Landing
  { path: '', component: PrincipalScreenComponent, pathMatch: 'full' },

  // Login
  { path: 'login-screen', component: LoginScreenComponent, pathMatch: 'full', canActivate: [LoginGuard] },

  // Registro (si quieres que sean públicos, déjalos sin guards)
  { path: 'registro-usuarios-screen', component: RegistroUsuariosScreenComponent, pathMatch: 'full' },
  { path: 'registro-usuarios', component: RegistroUsuariosComponent, pathMatch: 'full' },
  { path: 'registro-agentes', component: RegistroAgentesComponent, pathMatch: 'full' },
  { path: 'registro-admin', component: RegistroAdminComponent, pathMatch: 'full' },

  // ADMIN (solo admin)
  {
    path: 'inicio-admin',
    component: InicioAdminComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    pathMatch: 'full'
  },

  // AGENTE (solo agente)
  {
    path: 'inicio-agente',
    component: InicioAgenteComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['agente'] },
    children: [
      { path: '', redirectTo: 'tickets-asignados', pathMatch: 'full' },
      {
        path: 'tickets-asignados',
        component: TicketsAsignadosComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['agente'] }
      },
      {
        path: 'historial-tickets',
        loadComponent: () =>
          import('./partials/inicio-agente/historial-tickets/historial-tickets.component')
            .then(m => m.HistorialTicketsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['agente'] }
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./partials/inicio-agente/settings/settings.component')
            .then(m => m.SettingsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['agente'] }
      },
      {
        path: 'ticket/:id',
        component: TicketDetailComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['agente'] }
      }
    ]
  },

  // USUARIO (solo usuario)
  {
    path: 'inicio-usuario',
    component: InicioUsuarioComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['usuario'] },
    children: [
      { path: '', redirectTo: 'mis-tickets', pathMatch: 'full' },
      {
        path: 'mis-tickets',
        component: MisTicketsComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['usuario'] }
      },
      {
        path: 'crear-ticket',
        component: CrearTicketComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['usuario'] }
      },
      {
        path: 'editar-perfil',
        component: EditarPerfilComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['usuario'] }
      },
      {
        path: 'historial-tickets',
        loadComponent: () =>
          import('./partials/inicio-usuario/historial-tickets-usuario/historial-tickets-usuario.component')
            .then(m => m.HistorialTicketsUsuarioComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['usuario'] }
      },
      {
        path: 'ticket/:id',
        component: UserTicketDetailComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['usuario'] }
      }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
