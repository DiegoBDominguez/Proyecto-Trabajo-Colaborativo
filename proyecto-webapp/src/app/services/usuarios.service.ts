import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ValidatorService } from './tools/validator.service';
import { ErrorsService } from './tools/errors.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FacadeService } from './facade.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  constructor(
    private http: HttpClient,
    private validatorService: ValidatorService,
    private errorService: ErrorsService,
    private facadeService: FacadeService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) { }

  // Esquema base de usuario
  public esquemaUsuario() {
    return {
      'rol': 'usuario',
      'username': '',  // se asigna igual al email
      'first_name': '',
      'last_name': '',
      'email': '',
      'password': '',
      'confirmar_password': '',
      'telefono': '',
      'direccion': '',
      'fecha_nacimiento': ''
    }
  }

  // Validación de formulario
public validarDatos(data: any, editar: boolean, rol: string) {
    console.log("Validando usuario... ", data);
    let error: any = [];

    if (!this.validatorService.required(data["first_name"])) {
      error["first_name"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["last_name"])) {
      error["last_name"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["email"])) {
      error["email"] = this.errorService.required;
    } else if (!this.validatorService.max(data["email"], 40)) {
      error["email"] = this.errorService.max(40);
    } else if (!this.validatorService.email(data['email'])) {
      error['email'] = this.errorService.email;
    }

    if (!editar) {
      if (!this.validatorService.required(data["password"])) {
        error["password"] = this.errorService.required;
      }
      if (!this.validatorService.required(data["confirmar_password"])) {
        error["confirmar_password"] = this.errorService.required;
      }
    }

    if (!this.validatorService.required(data["fecha_nacimiento"])) {
      error["fecha_nacimiento"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["telefono"])) {
      error["telefono"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["direccion"])) {
      error["direccion"] = this.errorService.required;
    }

    return error;
  }

  // Servicios HTTP
  public registrar(data: any, rol: string): Observable<any> {
  const nuevoUsuario = { ...data, username: data.email, rol: rol };
  return this.http.post<any>(`${environment.url_api}/register/usuario/`, nuevoUsuario, httpOptions).pipe(
    tap((response) => {
      // 🔔 Notificar a los admins que se registró un nuevo usuario
      const currentUser = this.authService.getUser();
      const adminId = currentUser?.id || 0;
      this.notificationService.notifyNewUserRegistered(
        adminId,
        `${data.first_name} ${data.last_name}`,
        data.email,
        rol
      );
    })
  );
}


  public obtenerListaUsuarios(): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.get<any>(`${environment.url_api}/lista-usuarios/`, { headers: headers });
  }

  public obtenerUsuariosAgregados(): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.get<any>(`${environment.url_api}/admin/users-aggregates/`, { headers: headers });
  }

  public getUsuarioByID(idUser: number) {
    return this.http.get<any>(`${environment.url_api}/usuario/?id=${idUser}`, httpOptions);
  }

  public editarUsuario(data: any): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.put<any>(`${environment.url_api}/usuario-edit/`, data, { headers: headers });
  }

  public eliminarUsuario(idUser: number): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.delete<any>(`${environment.url_api}/usuario-edit/?id=${idUser}`, { headers: headers });
  }
}
