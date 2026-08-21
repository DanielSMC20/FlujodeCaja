export interface ResumenDashboard {
  ingresosMes: number;
  egresosMes: number;
  saldoAcumulado: number;
  saldoFechaTexto: string;
  movimientosMes: number;
  variacionIngresos: number;
  variacionEgresos: number;
  variacionSaldo: number;
  variacionMovimientosHoy: number;
}

export interface ComparacionSemanal {
  etiquetas: string[];
  ingresos: number[];
  egresos: number[];
  neto: number[];
}

export interface EvolucionSaldo {
  etiquetas: string[];
  valores: number[];
}

export interface DistribucionEgreso {
  categoria: string;
  porcentaje: number;
  monto: number;
}

export interface FlujoCajaDiario {
  fecha: string;
  concepto: string;
  ingreso: number;
  egreso: number;
  saldo: number;
}

export interface MovimientoResumen {
  id: number;
  fecha: string;
  tipoMovimiento: number;
  categoria: string;
  descripcion: string;
  monto: number;
  estado: string;
  origen: string;
  medioPago: string;
}

export interface PagoProximo {
  id: number;
  fecha: string;
  descripcion: string;
  categoria: string;
  proveedor: string;
  monto: number;
}

export interface NetoDiario {
  etiquetas: string[];
  valores: number[];
  ingresos: number[];
  egresos: number[];
}
