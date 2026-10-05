export interface AdministradorPlataformaSesion {

  id: number;

  correo: string;

  nombres: string;

  apellidos: string;

  nombreCompleto: string;
}


export interface PlataformaLoginResponse {

  accessToken: string;

  tokenType: string;

  expiresIn: number;

  administrador:
    AdministradorPlataformaSesion;
}