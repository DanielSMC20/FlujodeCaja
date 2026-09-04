export interface EmpresaSesion {
  id: number;
  ruc: string | null;
  razonSocial: string;
  nombreComercial: string;
  monedaBase: number;
  monedaBaseDescripcion: string;
  monedaBaseAbreviatura: string;
  zonaHoraria: string;
  activa: boolean;
}
