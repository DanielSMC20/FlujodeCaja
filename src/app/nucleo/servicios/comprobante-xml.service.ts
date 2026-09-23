import { Injectable } from '@angular/core';

import { Observable, from, map, throwError } from 'rxjs';

import { ComprobanteXmlProcesado } from '../modelos/comprobante-xml.model';

@Injectable({
  providedIn: 'root',
})
export class ComprobanteXmlService {
  procesarXml(archivo: File): Observable<ComprobanteXmlProcesado> {
    if (!archivo.name.toLowerCase().endsWith('.xml')) {
      return throwError(
        () => new Error('El archivo seleccionado no es un XML.'),
      );
    }

    if (archivo.size === 0) {
      return throwError(() => new Error('El archivo XML está vacío.'));
    }

    return from(
      Promise.all([archivo.text(), this.calcularHashSha256(archivo)]),
    ).pipe(
      map(([contenido, hashXml]) =>
        this.leerXml(contenido, archivo.name, hashXml),
      ),
    );
  }

  private leerXml(
    contenido: string,
    nombreArchivo: string,
    hashXml: string,
  ): ComprobanteXmlProcesado {
    const contenidoLimpio = this.normalizarContenidoXml(contenido);

    const parser = new DOMParser();

    const documento = parser.parseFromString(contenidoLimpio, 'text/xml');

    if (this.tieneErrorDeParseo(documento)) {
      throw new Error('El archivo XML no tiene una estructura válida.');
    }

    const raiz = documento.documentElement?.localName ?? '';

    if (!raiz) {
      throw new Error('No se pudo identificar el documento XML.');
    }

    const identificador = this.obtenerIdPrincipal(documento);

    const { serie, numero } = this.separarSerieNumero(identificador);

    const fechaEmision = this.obtenerPrimerValor(documento, [
      'IssueDate',
      'FechaEmision',
      'FechaEmisión',
      'Fecha',
    ]);

    const codigoMoneda = this.obtenerCodigoMoneda(documento);

    const tipoComprobante = this.obtenerTipoComprobante(
      documento,
      raiz,
      identificador,
    );

    const importeTotal = this.obtenerImporteTotal(documento);

    const emisor = this.obtenerEmisor(documento);

    const descripcion = this.obtenerDescripcion(documento);

    const resultado: ComprobanteXmlProcesado = {
  nombreArchivo,
  hashXml,

  tipoComprobante: tipoComprobante.valor,
  tipoComprobanteTexto: tipoComprobante.texto,
  fechaEmision: fechaEmision || undefined,
  serie: serie || undefined,
  numero: numero || undefined,
  moneda: this.obtenerMoneda(codigoMoneda),
  codigoMoneda: codigoMoneda || undefined,
  importeTotal,
  documentoEmisor: emisor.documento || undefined,
  razonSocialEmisor: emisor.razonSocial || undefined,
  descripcion: descripcion || undefined,
  camposEncontrados: 0,
};

    resultado.camposEncontrados = this.contarCamposEncontrados(resultado);

    if (resultado.camposEncontrados === 0) {
      throw new Error(
        'El XML es válido, pero no se pudo identificar información del comprobante.',
      );
    }

    return resultado;
  }

  private normalizarContenidoXml(contenido: string): string {
    return contenido
      .replace(/^\uFEFF/, '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .trim();
  }

  private tieneErrorDeParseo(documento: Document): boolean {
    const raiz = documento.documentElement;

    if (!raiz) {
      return true;
    }

    if (raiz.localName.toLowerCase() === 'parsererror') {
      return true;
    }

    const errores = documento.getElementsByTagNameNS('*', 'parsererror');

    if (errores.length > 0) {
      return true;
    }

    const elementos = documento.getElementsByTagName('*');

    for (let indice = 0; indice < elementos.length; indice++) {
      if (elementos[indice].localName.toLowerCase() === 'parsererror') {
        return true;
      }
    }

    return false;
  }

  private obtenerTipoComprobante(
    documento: Document,
    tipoRaiz: string,
    identificador: string,
  ): {
    valor?: number;
    texto: string;
  } {
    const raiz = tipoRaiz.trim().toLowerCase();

    const invoiceTypeCode = this.obtenerPrimerValor(documento, [
      'InvoiceTypeCode',
      'TipoDocumento',
      'TipoComprobante',
    ]);

    if (this.esReciboPorHonorarios(documento, identificador)) {
      return {
        valor: 3,
        texto: 'Recibo por honorarios',
      };
    }

    if (raiz === 'invoice') {
      if (invoiceTypeCode === '03') {
        return {
          valor: 2,
          texto: 'Boleta',
        };
      }

      if (invoiceTypeCode === '01') {
        return {
          valor: 1,
          texto: 'Factura',
        };
      }
    }

    if (raiz === 'creditnote') {
      return {
        texto: 'Nota de crédito',
      };
    }

    if (raiz === 'debitnote') {
      return {
        texto: 'Nota de débito',
      };
    }

    if (
      raiz.includes('honor') ||
      raiz.includes('recibo') ||
      raiz.includes('receipt')
    ) {
      return {
        valor: 3,
        texto: 'Recibo por honorarios',
      };
    }

    if (invoiceTypeCode === '03') {
      return {
        valor: 2,
        texto: 'Boleta',
      };
    }

    if (invoiceTypeCode === '01') {
      return {
        valor: 1,
        texto: 'Factura',
      };
    }

    return {
      texto: tipoRaiz || 'Comprobante XML',
    };
  }

  private esReciboPorHonorarios(
    documento: Document,
    identificador: string,
  ): boolean {
    const categorias = this.obtenerElementosPorLocalName(
      documento,
      'TaxCategory',
    );

    const tieneRetencionCuarta = categorias.some((categoria) => {
      const identificadorCategoria = this.obtenerPrimerValor(categoria, ['ID'])
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      return (
        identificadorCategoria.includes('RET 4TA') ||
        identificadorCategoria.includes('RET4TA')
      );
    });

    if (tieneRetencionCuarta) {
      return true;
    }

    const { serie } = this.separarSerieNumero(identificador);

    const serieRhe = /^E\d{3}$/i.test(serie);

    if (!serieRhe) {
      return false;
    }

    const emisor = this.obtenerEmisor(documento);

    const rucPersonaNatural = emisor.documento.trim().startsWith('10');

    const cantidades = this.obtenerElementosPorLocalName(
      documento,
      'InvoicedQuantity',
    );

    const utilizaUnidadRhe = cantidades.some(
      (elemento) => elemento.getAttribute('unitCode')?.toUpperCase() === 'ZZ',
    );

    return rucPersonaNatural && utilizaUnidadRhe;
  }

  private obtenerCodigoMoneda(documento: Document): string {
    const monedaDocumento = this.obtenerPrimerValor(documento, [
      'DocumentCurrencyCode',
      'CurrencyCode',
      'Moneda',
    ]);

    if (monedaDocumento) {
      return monedaDocumento.trim().toUpperCase();
    }

    const elementosPrioritarios = [
      'PayableAmount',
      'TaxInclusiveAmount',
      'TaxExclusiveAmount',
      'Amount',
      'PriceAmount',
      'TaxableAmount',
      'LineExtensionAmount',
    ];

    for (const nombre of elementosPrioritarios) {
      const elementos = this.obtenerElementosPorLocalName(documento, nombre);

      for (const elemento of elementos) {
        const codigo = elemento.getAttribute('currencyID');

        if (codigo) {
          return codigo.trim().toUpperCase();
        }
      }
    }

    return '';
  }

  private obtenerImporteTotal(documento: Document): number | undefined {
    const nombres = [
      'PayableAmount',
      'TaxInclusiveAmount',
      'GrandTotal',
      'TotalAmount',
      'ImporteTotal',
      'MontoTotal',
      'Total',
    ];

    for (const nombre of nombres) {
      const elementos = this.obtenerElementosPorLocalName(documento, nombre);

      for (const elemento of elementos) {
        const texto = elemento.textContent?.trim().replace(',', '.');

        if (!texto) {
          continue;
        }

        const numero = Number(texto);

        if (Number.isFinite(numero)) {
          return numero;
        }
      }
    }

    return undefined;
  }

  private obtenerEmisor(documento: Document): {
    documento: string;
    razonSocial: string;
  } {
    const nombresProveedor = [
      'AccountingSupplierParty',
      'SupplierParty',
      'SellerSupplierParty',
      'SenderParty',
      'IssuerParty',
      'Emisor',
      'Proveedor',
    ];

    const proveedores = nombresProveedor.flatMap((nombre) =>
      this.obtenerElementosPorLocalName(documento, nombre),
    );

    for (const proveedor of proveedores) {
      const documentoEmisor = this.obtenerPrimerValor(proveedor, [
        'CompanyID',
        'CustomerAssignedAccountID',
        'RUC',
        'NumeroDocumento',
        'DocumentNumber',
        'ID',
      ]);

      const razonSocial = this.obtenerPrimerValor(proveedor, [
        'RegistrationName',
        'PartyName',
        'Name',
        'RazonSocial',
        'RazónSocial',
        'BusinessName',
        'Nombre',
      ]);

      const datos = {
        documento: this.normalizarDocumentoEmisor(documentoEmisor),
        razonSocial: this.limpiarTexto(razonSocial),
      };

      if (datos.documento || datos.razonSocial) {
        return datos;
      }
    }

    const documentoEmisor = this.obtenerPrimerValor(documento, [
      'RUCEmisor',
      'RucEmisor',
      'NumeroDocumentoEmisor',
      'DocumentoEmisor',
      'DocumentNumber',
    ]);

    const razonSocial = this.obtenerPrimerValor(documento, [
      'RazonSocialEmisor',
      'RazónSocialEmisor',
      'NombreEmisor',
    ]);

    return {
      documento: this.normalizarDocumentoEmisor(documentoEmisor),

      razonSocial: this.limpiarTexto(razonSocial),
    };
  }

  private normalizarDocumentoEmisor(valor: string): string {
    const texto = this.limpiarTexto(valor);

    if (!texto) {
      return '';
    }

    const numeroFiscal = texto.match(/\b\d{8,15}\b/);
    return numeroFiscal?.[0] ?? texto;
  }

  private obtenerDescripcion(documento: Document): string {
    const nombres = [
      'Description',
      'ItemDescription',
      'Concepto',
      'Descripcion',
      'Descripción',
      'Detalle',
    ];

    for (const nombre of nombres) {
      const elementos = this.obtenerElementosPorLocalName(documento, nombre);

      for (const elemento of elementos) {
        const descripcion = this.limpiarTexto(elemento.textContent ?? '');

        if (descripcion) {
          return descripcion.substring(0, 150);
        }
      }
    }

    return '';
  }

  private obtenerIdPrincipal(documento: Document): string {
    const raiz = documento.documentElement;

    for (let indice = 0; indice < raiz.children.length; indice++) {
      const hijo = raiz.children[indice];

      if (hijo.localName.toLowerCase() === 'id') {
        const valor = this.limpiarTexto(hijo.textContent ?? '');

        if (valor) {
          return valor;
        }
      }
    }

    const serie = this.obtenerPrimerValor(documento, [
      'Serie',
      'SerieComprobante',
    ]);

    const numero = this.obtenerPrimerValor(documento, [
      'Numero',
      'Número',
      'NumeroComprobante',
    ]);

    if (serie && numero) {
      return `${serie}-${numero}`;
    }

    return '';
  }

  private separarSerieNumero(identificador: string): {
    serie: string;
    numero: string;
  } {
    if (!identificador) {
      return {
        serie: '',
        numero: '',
      };
    }

    const valor = identificador.trim();

    const indice = valor.indexOf('-');

    if (indice === -1) {
      return {
        serie: '',
        numero: valor,
      };
    }

    return {
      serie: valor.substring(0, indice).trim(),

      numero: valor.substring(indice + 1).trim(),
    };
  }

  private obtenerPrimerValor(
    origen: Document | Element,
    nombres: string[],
  ): string {
    for (const nombre of nombres) {
      const valor = this.obtenerTextoPorLocalName(origen, nombre);

      if (valor) {
        return valor;
      }
    }

    return '';
  }

  private obtenerTextoPorLocalName(
    origen: Document | Element,
    nombre: string,
  ): string {
    const elementos = origen.getElementsByTagName('*');

    for (let indice = 0; indice < elementos.length; indice++) {
      const elemento = elementos[indice];

      if (elemento.localName.toLowerCase() === nombre.toLowerCase()) {
        const texto = this.limpiarTexto(elemento.textContent ?? '');

        if (texto) {
          return texto;
        }
      }
    }

    return '';
  }

  private obtenerElementosPorLocalName(
    origen: Document | Element,
    nombre: string,
  ): Element[] {
    const resultado: Element[] = [];

    const elementos = origen.getElementsByTagName('*');

    for (let indice = 0; indice < elementos.length; indice++) {
      const elemento = elementos[indice];

      if (elemento.localName.toLowerCase() === nombre.toLowerCase()) {
        resultado.push(elemento);
      }
    }

    return resultado;
  }

  private obtenerMoneda(codigo: string): number | undefined {
    const moneda = codigo.trim().toUpperCase();

    if (moneda === 'PEN' || moneda === 'SOLES' || moneda === 'SOL') {
      return 1;
    }

    if (moneda === 'USD' || moneda === 'DOLARES' || moneda === 'DÓLARES') {
      return 2;
    }

    return undefined;
  }

  private limpiarTexto(valor: string): string {
    return valor.replace(/\s+/g, ' ').trim();
  }

  private contarCamposEncontrados(resultado: ComprobanteXmlProcesado): number {
    const campos = [
      resultado.tipoComprobante,
      resultado.fechaEmision,
      resultado.serie,
      resultado.numero,
      resultado.moneda,
      resultado.importeTotal,
      resultado.documentoEmisor,
      resultado.razonSocialEmisor,
      resultado.descripcion,
    ];

    return campos.filter(
      (valor) => valor !== undefined && valor !== null && valor !== '',
    ).length;
  }
  private async calcularHashSha256(
  archivo: File,
): Promise<string> {
  const contenido = await archivo.arrayBuffer();

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    contenido,
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, '0'),
    )
    .join('');
}
}
