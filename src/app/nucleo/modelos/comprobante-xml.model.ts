export interface ComprobanteXmlProcesado {

  tipoComprobante?: number;

  tipoComprobanteTexto?: string;

  fechaEmision?: string;

  serie?: string;

  numero?: string;

  moneda?: number;

  codigoMoneda?: string;

  importeTotal?: number;

  documentoEmisor?: string;

  razonSocialEmisor?: string;

  descripcion?: string;

  nombreArchivo: string;

  camposEncontrados: number;

}