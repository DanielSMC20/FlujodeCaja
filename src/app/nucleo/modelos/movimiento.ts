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

  /* =========================================================
     COMPROBANTE
     ========================================================= */

  fechaComprobante?: string | null;
  fechaVencimiento?: string | null;

  serieComprobante?: string | null;
  numeroComprobante?: string | null;

  documentoEmisor?: string | null;
  razonSocialEmisor?: string | null;

  /* =========================================================
     DATOS TRIBUTARIOS
     ========================================================= */

  baseImponible?: number | null;
  igv?: number | null;
  inafecto?: number | null;
  isc?: number | null;
  icbper?: number | null;
  exonerado?: number | null;

  porcentajeIgv?: number | null;
  tipoCambio?: number | null;

  /* =========================================================
     XML
     ========================================================= */

  archivoXmlNombre?: string | null;
  hashXml?: string | null;

  /* =========================================================
     AUDITORÍA
     ========================================================= */

  usuarioRegistro?: string | null;
  fechaRegistro?: string | null;

  activo?: boolean;
}

export interface MovimientoDetalle extends Movimiento {}

/* =========================================================
   FILTROS
   ========================================================= */

export interface FiltroMovimientos {
  tipoMovimiento?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  cancelado?: boolean;
  soloActivos?: boolean;
}

/* =========================================================
   REGISTRO
   ========================================================= */

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

  /* =========================================================
     COMPROBANTE
     ========================================================= */

  fechaComprobante?: string;
  fechaVencimiento?: string;

  serieComprobante?: string;
  numeroComprobante?: string;

  documentoEmisor?: string;
  razonSocialEmisor?: string;

  /* =========================================================
     DATOS TRIBUTARIOS
     ========================================================= */

  baseImponible?: number;
  igv?: number;
  inafecto?: number;
  isc?: number;
  icbper?: number;
  exonerado?: number;

  porcentajeIgv?: number;
  tipoCambio?: number;

  /* =========================================================
     XML
     ========================================================= */

  archivoXmlNombre?: string;
  hashXml?: string;
}

/* =========================================================
   ACTUALIZACIÓN
   ========================================================= */

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

  /* =========================================================
     COMPROBANTE
     ========================================================= */

  fechaComprobante?: string;
  fechaVencimiento?: string;

  serieComprobante?: string;
  numeroComprobante?: string;

  documentoEmisor?: string;
  razonSocialEmisor?: string;

  /* =========================================================
     DATOS TRIBUTARIOS
     ========================================================= */

  baseImponible?: number;
  igv?: number;
  inafecto?: number;
  isc?: number;
  icbper?: number;
  exonerado?: number;

  porcentajeIgv?: number;
  tipoCambio?: number;

  /* =========================================================
     XML
     ========================================================= */

  archivoXmlNombre?: string;
  hashXml?: string;
}

/* =========================================================
   ANULACIÓN
   ========================================================= */

export interface AnularMovimientoRequest {
  motivo: string;
}

/* =========================================================
   PAGO
   ========================================================= */

export interface PagarMovimientoRequest {
  fechaPago: string;
}

export interface CancelarEgresoRequest {
  fechaPago: string;
}