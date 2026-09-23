export type FlagCancelado = 0 | 1;

export interface Movimiento {
  id: number;

  empresaId: number;

  tipoMovimiento: number;
  tipoMovimientoDescripcion?: string;

  categoriaId: number;
  categoria: string;

  fechaMovimiento: string;
  fechaProyectada?: string | null;
  fechaPago?: string | null;

  bCancelado?: FlagCancelado;

  cancelado?: boolean | null;

  descripcion: string;
  monto: number;

  medioPago: number;
  medioPagoDescripcion?: string;

  tipoComprobante: number;
  tipoComprobanteDescripcion?: string;

  moneda: number;
  monedaDescripcion?: string;
  monedaAbreviatura?: string;

  origenRegistro: number;
  origenRegistroDescripcion?: string;

  observacion?: string | null;

  fechaComprobante?: string | null;

  serieComprobante?: string | null;

  numeroComprobante?: string | null;

  documentoEmisor?: string | null;

  razonSocialEmisor?: string | null;

  archivoXmlNombre?: string | null;

  hashXml?: string | null;

  usuarioRegistro?: string | null;

  fechaRegistro?: string | null;

  activo?: boolean;
}


export interface MovimientoDetalle extends Movimiento {
  fechaComprobante?: string | null;

  serieComprobante?: string | null;

  numeroComprobante?: string | null;

  documentoEmisor?: string | null;

  razonSocialEmisor?: string | null;

  archivoXmlNombre?: string | null;

  hashXml?: string | null;
}


export interface RegistrarMovimientoRequest {
  tipoMovimiento: number;

  categoriaId: number;

  fechaMovimiento: string;

  fechaProyectada?: string;

  fechaPago?: string;

  bCancelado?: FlagCancelado;

  cancelado?: boolean;

  descripcion: string;

  monto: number;

  medioPago: number;

  tipoComprobante: number;

  moneda: number;

  origenRegistro?: number;

  observacion?: string;

  fechaComprobante?: string;

  serieComprobante?: string;

  numeroComprobante?: string;

  documentoEmisor?: string;

  razonSocialEmisor?: string;

  archivoXmlNombre?: string;

  hashXml?: string;
}


export interface ActualizarMovimientoRequest {
  categoriaId: number;

  fechaMovimiento?: string;

  fechaProyectada?: string;

  descripcion: string;

  monto: number;

  medioPago?: number;

  tipoComprobante?: number;

  moneda?: number;

  observacion?: string;

  fechaComprobante?: string;

  serieComprobante?: string;

  numeroComprobante?: string;

  documentoEmisor?: string;

  razonSocialEmisor?: string;

  archivoXmlNombre?: string;

  hashXml?: string;
}
export interface AnularMovimientoRequest {
  motivo: string;
}


export interface PagarMovimientoRequest {
  fechaPago: string;
}

export interface CancelarEgresoRequest {
  fechaPago: string;
}


export interface AnularMovimientoRequest {
  motivo: string;
}
