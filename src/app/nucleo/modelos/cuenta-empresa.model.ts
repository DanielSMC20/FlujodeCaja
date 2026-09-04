export interface RolGestion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface CrearCuentaEmpresaRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rolId: number;
}

export interface CuentaEmpresaCreada {
  id: number;
  empresaId: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolGestion;
  activa: boolean;
  fechaRegistro: string;
}
