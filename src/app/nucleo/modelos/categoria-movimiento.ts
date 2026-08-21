export interface CategoriaMovimiento {
  id: number;
  empresaId: number;
  nombre: string;
  tipoMovimiento: number;
  descripcion: string;
  estado: boolean;
}

export interface RegistrarCategoriaRequest {
  nombre: string;
  tipoMovimiento: number;
  descripcion: string;
}

export interface ActualizarCategoriaRequest {
  nombre: string;
  descripcion: string;
}