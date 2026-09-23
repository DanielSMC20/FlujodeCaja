export interface FiltroReporteMovimientos {
  fechaDesde?: string;
  fechaHasta?: string;

  tipoMovimiento?: number;

  categoriaId?: number;

  cancelado?: boolean;

  origenRegistro?: number;

  incluirAnulados?: boolean;
}

export interface ResumenReporteMovimientos {
  cantidadRegistros: number;

  cantidadAnulados: number;

  totalIngresos: number;

  totalEgresosPagados: number;

  totalEgresosProyectados: number;

  netoReal: number;
}

export interface ResultadoReporteMovimientos {
  resumen: ResumenReporteMovimientos;

  movimientos: ReporteMovimiento[];
}

export interface ReporteMovimiento {
  id: number;

  fechaMovimiento: string;

  fechaProyectada?: string | null;

  fechaPago?: string | null;

  tipoMovimiento: number;

  tipoMovimientoDescripcion: string;

  categoriaId: number;

  categoria: string;

  descripcion: string;

  monto: number;

  medioPago: number;

  medioPagoDescripcion: string;

  tipoComprobante: number;

  tipoComprobanteDescripcion: string;

  moneda: number;

  monedaDescripcion: string;

  monedaAbreviatura: string;

  origenRegistro: number;

  origenRegistroDescripcion: string;

  cancelado: boolean | null;

  estado: string;

  observacion?: string | null;

  activo: boolean;

  fechaAnulacion?: string | null;

  motivoAnulacion?: string | null;
}