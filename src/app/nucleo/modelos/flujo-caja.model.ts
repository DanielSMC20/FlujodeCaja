export interface ResumenFlujoCaja {
  fechaDesde: string | null;
  fechaHasta: string | null;
  saldoInicialReal: number;
  saldoInicialProyectado: number;
  totalIngresos: number;
  totalEgresosPagados: number;
  totalEgresosProyectados: number;
  saldoFinalReal: number;
  saldoFinalProyectado: number;
}

export interface FlujoCajaPorDia {
  fecha: string;
  ingresos: number;
  egresosPagados: number;
  egresosProyectados: number;
  flujoReal: number;
  flujoProyectado: number;
  saldoReal: number;
  saldoProyectado: number;
}

export interface ResultadoFlujoCaja {
  resumen: ResumenFlujoCaja;
  filas: FlujoCajaPorDia[];
}
