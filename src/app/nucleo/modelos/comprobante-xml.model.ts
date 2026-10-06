export interface ComprobanteXmlProcesado {
  nombreArchivo: string;

  hashXml: string;

  tipoComprobante?: number;

  tipoComprobanteTexto?: string;

  fechaEmision?: string;

  fechaVencimiento?: string;

  serie?: string;

  numero?: string;

  moneda?: number;

  codigoMoneda?: string;

  importeTotal?: number;

  documentoEmisor?: string;

  razonSocialEmisor?: string;

  descripcion?: string;

  /* =============================================
     DATOS TRIBUTARIOS
     ============================================= */

  baseImponible: number;

  igv: number;

  inafecto: number;

  isc: number;

  icbper: number;

  exonerado: number;

  porcentajeIgv?: number;

  tipoCambio?: number;

  camposEncontrados: number;
}