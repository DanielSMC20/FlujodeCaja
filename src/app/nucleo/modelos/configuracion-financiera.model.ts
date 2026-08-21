export interface ConfiguracionFinanciera {

  empresaId: number;

  saldoInicial: number;

  fechaSaldoInicial: string;

  moneda: number;

}

export interface ActualizarConfiguracionFinancieraRequest {

  saldoInicial: number;

  fechaSaldoInicial: string;

  moneda: number;

}