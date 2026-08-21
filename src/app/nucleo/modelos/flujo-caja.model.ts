export interface ResumenFlujoCaja {

  totalIngresos: number;

  totalEgresos: number;

  neto: number;

  cantidadMovimientos: number;

  diasConMovimiento: number;

}


export interface FlujoCajaPorDia {

  fecha: string;

  cantidadMovimientos: number;

  ingresos: number;

  egresos: number;

  neto: number;

}


export interface ResultadoFlujoCaja {

  resumen: ResumenFlujoCaja;

  filas: FlujoCajaPorDia[];

}