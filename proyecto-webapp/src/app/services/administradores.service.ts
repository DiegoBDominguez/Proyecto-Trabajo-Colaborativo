import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ValidatorService } from './tools/validator.service';
import { ErrorsService } from './tools/errors.service';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FacadeService } from './facade.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AdministradoresService {

  constructor(
    private http: HttpClient,
    private validatorService: ValidatorService,
    private errorService: ErrorsService,
    private facadeService: FacadeService
  ) { }

  // Esquema de admin para formulario
  public esquemaAdmin() {
    return {
      username: '',          // será igual al email
      email: '',
      password: '',
      confirmar_password: '',
      first_name: '',
      last_name: '',
      telefono: '',
      rfc: '',
      edad: null,
      ocupacion: ''
    };
  }

  // Validación de campos
  public validarAdmin(data: any, editar: boolean) {
    let error: any = {};

    if (!this.validatorService.required(data["email"])) {
      error["email"] = this.errorService.required;
    } else if (!this.validatorService.max(data["email"], 40)) {
      error["email"] = this.errorService.max(40);
    } else if (!this.validatorService.email(data["email"])) {
      error["email"] = this.errorService.email;
    }

    if (!this.validatorService.required(data["first_name"])) {
      error["first_name"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["last_name"])) {
      error["last_name"] = this.errorService.required;
    }

    if (!editar) {
      if (!this.validatorService.required(data["password"])) {
        error["password"] = this.errorService.required;
      }
      if (!this.validatorService.required(data["confirmar_password"])) {
        error["confirmar_password"] = this.errorService.required;
      }
    }

    if (!this.validatorService.required(data["rfc"])) {
      error["rfc"] = this.errorService.required;
    } else if (!this.validatorService.min(data["rfc"], 12) || !this.validatorService.max(data["rfc"], 13)) {
      error["rfc"] = "RFC debe tener entre 12 y 13 caracteres";
    }

    if (!this.validatorService.required(data["edad"])) {
      error["edad"] = this.errorService.required;
    } else if (!this.validatorService.numeric(data["edad"])) {
      error["edad"] = "Solo se permiten números";
    }

    if (!this.validatorService.required(data["telefono"])) {
      error["telefono"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["ocupacion"])) {
      error["ocupacion"] = this.errorService.required;
    }

    return error;
  }

  // Registrar admin usando la URL de Django
  public registrarAdmin(data: any): Observable<any> {
    // Asegurarse de que username sea el email y rol sea 'admin'
    const payload = { ...data, username: data.email, rol: 'admin' };
    return this.http.post<any>(`${environment.apiUrl}/register/admin/`, payload, httpOptions);
  }

  public obtenerListaAdmins(): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.get<any>(`${environment.apiUrl}/lista-admins/`, { headers });
  }

  public getAdminByID(idUser: number) {
    return this.http.get<any>(`${environment.apiUrl}/admin/?id=${idUser}`, httpOptions);
  }

  public editarAdmin(data: any): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.put<any>(`${environment.apiUrl}/admins-edit/`, data, { headers });
  }

  public eliminarAdmin(idUser: number): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.delete<any>(`${environment.apiUrl}/admins-edit/?id=${idUser}`, { headers });
  }

  public getTotalUsuarios(): Observable<any> {
    const token = this.facadeService.getSessionToken();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token });
    return this.http.get<any>(`${environment.apiUrl}/admins-edit/`, { headers });
  }
}
