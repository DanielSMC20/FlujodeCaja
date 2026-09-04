export interface RolSesion {
  id: number;
  codigo: string;
  nombre: string;
}

export interface UsuarioSesion {
  id: number;
  empresaId: number;
  nombres: string;
  apellidos: string;
  correo: string;
  correoVerificado: boolean;
  activo: boolean;
  ultimoAcceso: string | null;
  roles: RolSesion[];
}