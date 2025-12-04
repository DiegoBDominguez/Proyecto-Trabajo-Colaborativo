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
export class AgentesService {

  constructor(
    private http: HttpClient,
    private validatorService: ValidatorService,
    private errorService: ErrorsService,
    private facadeService: FacadeService
  ) { }

  public esquemaAgente() {
  return {
    'rol': '',
    'clave_usuario': '',
    'first_name': '',
    'last_name': '',
    'email': '',
    'password': '',
    'confirmar_password': '',
    'telefono': '',
    'especialidad': '',
    'experiencia': ''
  }
}

   // Validación para el formulario de Agente
  public validarAgente(data: any, editar: boolean) {
    console.log("Validando agente... ", data);

    let error: any = [];

    if (!this.validatorService.required(data["clave_usuario"])) {
      error["clave_usuario"] = this.errorService.required;
    }

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

    if (!this.validatorService.required(data["telefono"])) {
      error["telefono"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["especialidad"])) {
      error["especialidad"] = this.errorService.required;
    }

    if (!this.validatorService.required(data["experiencia"])) {
      error["experiencia"] = this.errorService.required;
    }

    return error;
  }

public registrarAgente(data: any): Observable<any> {
    return this.http.post<any>(
        `${environment.apiUrl}/register/agente/`, 
        data, 
        httpOptions
    );
}
  // Obtener un solo agente por ID
  public getAgenteByID(idUser: number) {
    return this.http.get<any>(`${environment.apiUrl}/agentes/?id=${idUser}`, httpOptions);
  }

}