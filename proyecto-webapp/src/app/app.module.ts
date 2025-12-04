// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Para el pipe date

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Screens
import { LoginScreenComponent } from './screens/login-screen/login-screen.component';
import { RegistroUsuariosScreenComponent } from './screens/registro-usuarios-screen/registro-usuarios-screen.component';
import { PrincipalScreenComponent } from './screens/principal-screen/principal-screen.component';

// Partials
import { RegistroAdminComponent } from './partials/registro-admin/registro-admin.component';
import { RegistroAgentesComponent } from './partials/registro-agentes/registro-agentes.component';
import { RegistroUsuariosComponent } from './partials/registro-usuarios/registro-usuarios.component';
import { InicioUsuarioComponent } from './partials/inicio-usuario/inicio-usuario.component';
import { InicioAgenteComponent } from './partials/inicio-agente/inicio-agente.component';
import { InicioAdminComponent } from './partials/inicio-admin/inicio-admin.component';

// Nuevos componentes del usuario
import { MisTicketsComponent } from './partials/inicio-usuario/mis-tickets/mis-tickets.component';
import { CrearTicketComponent } from './partials/inicio-usuario/crear-ticket/crear-ticket.component';
import { EditarPerfilComponent } from './partials/inicio-usuario/editar-perfil/editar-perfil.component';

// Nuevos componentes del agente
import { TicketsAsignadosComponent } from './partials/inicio-agente/tickets-asignados/tickets-asignados.component';
import { TicketDetailComponent } from './partials/inicio-agente/ticket-detail/ticket-detail.component'; // Añadido

// Nuevos componentes del usuario
import { UserTicketDetailComponent } from './partials/inicio-usuario/user-ticket-detail/user-ticket-detail.component';

// Nuevo del guard
import { AuthInterceptor } from './guards/auth.interceptor';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { AdminUsersTableComponent } from './partials/inicio-admin/admin-users-table/admin-users-table.component';
import { NotificationBellComponent } from './partials/header/notification-bell/notification-bell.component';
import { AdminDashboardComponent } from './partials/inicio-admin/admin-dashboard/admin-dashboard.component';
import { StatsCardsComponent } from './partials/inicio-admin/admin-dashboard/stats-cards/stats-cards.component';
import { ChartLineComponent } from './partials/inicio-admin/admin-dashboard/chart-line/chart-line.component';
import { ChartPieComponent } from './partials/inicio-admin/admin-dashboard/chart-pie/chart-pie.component';
import { ChartBarComponent } from './partials/inicio-admin/admin-dashboard/chart-bar/chart-bar.component';
import { TicketsByCategoryComponent } from './partials/inicio-admin/admin-dashboard/tickets-by-category/tickets-by-category.component';
import { ChartUsersPieComponent } from './partials/inicio-admin/admin-dashboard/chart-users-pie/chart-users-pie.component';
import { ChartUsersSvgPieComponent } from './partials/inicio-admin/admin-dashboard/chart-users-svg-pie/chart-users-svg-pie.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginScreenComponent,
    RegistroUsuariosScreenComponent,
    RegistroAdminComponent,
    RegistroAgentesComponent,
    RegistroUsuariosComponent,
    PrincipalScreenComponent,
    InicioUsuarioComponent,
    InicioAgenteComponent,
    InicioAdminComponent,
    MisTicketsComponent,
    CrearTicketComponent,
    EditarPerfilComponent,
    TicketsAsignadosComponent,
    TicketDetailComponent, // Añadido
    UserTicketDetailComponent, // Nuevo para usuario
    AdminUsersTableComponent
    , AdminDashboardComponent
    , StatsCardsComponent
    , ChartLineComponent
    , ChartPieComponent
    , ChartBarComponent
    , TicketsByCategoryComponent
    , ChartUsersPieComponent
    , ChartUsersSvgPieComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    CommonModule, // Para el pipe date
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatRadioModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    NotificationBellComponent // Importar standalone component
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }