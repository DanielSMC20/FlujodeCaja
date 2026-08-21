import { FlagCancelado } from './movimiento';

export type EstadoEgresoTexto = 'Proyectado' | 'Pagado';

export interface FilaCargaMasivaEgreso {
  filaExcel: number;

  fechaMovimiento: string;

  descripcion: string;

  monto: number;

  clasificador: string;

  categoriaId: number | null;

  categoria: string;

  bCancelado: FlagCancelado;

  estadoTexto: EstadoEgresoTexto;

  valido: boolean;

  errores: string[];
}

export interface ResultadoCargaMasivaEgreso {
  nombreArchivo: string;

  totalFilas: number;

  filasValidas: number;

  filasConError: number;

  totalProyectados: number;

  totalPagados: number;

  montoProyectado: number;

  montoPagado: number;

  filas: FilaCargaMasivaEgreso[];
}
