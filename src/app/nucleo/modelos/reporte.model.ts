export interface FiltroReporteMovimientos {

  fechaDesde?: string;

  fechaHasta?: string;

  tipoMovimiento?: number;

  categoriaId?: number;

}


export interface ResumenReporteMovimientos {

  totalIngresos: number;

  totalEgresos: number;

  neto: number;

  cantidadMovimientos: number;

}


export interface ResultadoReporteMovimientos {

  resumen: ResumenReporteMovimientos;

  movimientos: ReporteMovimiento[];

}


export interface ReporteMovimiento {

  id: number;

  fechaMovimiento: string;

  tipoMovimiento: number;

  categoriaId: number;

  categoria: string;

  descripcion: string;

  monto: number;

  medioPago: number;

  tipoComprobante: number;

  moneda: number;

  origenRegistro: number;

}