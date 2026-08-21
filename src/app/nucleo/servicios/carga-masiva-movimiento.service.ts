import { Injectable, inject } from '@angular/core';

import {
  Observable,
  concatMap,
  defer,
  from,
  map,
  switchMap,
  throwError,
  toArray,
} from 'rxjs';

import * as XLSX from 'xlsx';

import { CategoriaMovimiento } from '../modelos/categoria-movimiento';

import {
  FilaCargaMasivaEgreso,
  ResultadoCargaMasivaEgreso,
} from '../modelos/carga-masiva-movimiento';

import {
  FlagCancelado,
  Movimiento,
  RegistrarMovimientoRequest,
} from '../modelos/movimiento';

import { CategoriaService } from './categoria.service';
import { MovimientoService } from './movimiento.service';

@Injectable({
  providedIn: 'root',
})
export class CargaMasivaMovimientoService {
  private readonly categoriaService = inject(CategoriaService);

  private readonly movimientoService = inject(MovimientoService);

  procesarArchivo(archivo: File): Observable<ResultadoCargaMasivaEgreso> {
    const extension = archivo.name.toLowerCase().split('.').pop();

    if (extension !== 'xlsx') {
      return throwError(
        () => new Error('Solo se permiten archivos Excel con extensión .xlsx.'),
      );
    }

    if (archivo.size === 0) {
      return throwError(() => new Error('El archivo seleccionado está vacío.'));
    }

    return from(archivo.arrayBuffer()).pipe(
      switchMap((buffer) =>
        this.categoriaService
          .listarCategoriasPorTipo(2)
          .pipe(
            map((categorias) =>
              this.procesarLibro(buffer, archivo.name, categorias),
            ),
          ),
      ),
    );
  }

  construirRequests(
    resultado: ResultadoCargaMasivaEgreso,
  ): RegistrarMovimientoRequest[] {
    if (resultado.filasConError > 0) {
      throw new Error(
        'No se puede confirmar la carga mientras existan filas con errores.',
      );
    }

    return resultado.filas.map((fila) => {
      if (fila.categoriaId === null) {
        throw new Error(
          `La fila ${fila.filaExcel} no tiene una categoría válida.`,
        );
      }

      return {
        tipoMovimiento: 2,

        fechaMovimiento: fila.fechaMovimiento,

        categoriaId: fila.categoriaId,

        descripcion: fila.descripcion,

        monto: fila.monto,

        medioPago: 9,

        moneda: 1,

        tipoComprobante: 5,

        origenRegistro: 3,

        bCancelado: fila.bCancelado,
      };
    });
  }

  registrarResultado(
    resultado: ResultadoCargaMasivaEgreso,
  ): Observable<Movimiento[]> {
    return defer(() => from(this.construirRequests(resultado))).pipe(
      concatMap((request) => this.movimientoService.registrarMovimiento(request)),
      toArray(),
    );
  }

  private procesarLibro(
    buffer: ArrayBuffer,
    nombreArchivo: string,
    categorias: CategoriaMovimiento[],
  ): ResultadoCargaMasivaEgreso {
    let libro: XLSX.WorkBook;

    try {
      libro = XLSX.read(buffer, {
        type: 'array',

        cellDates: true,
      });
    } catch {
      throw new Error('No se pudo leer el archivo Excel.');
    }

    const hoja = libro.Sheets['Carga'];

    if (!hoja) {
      throw new Error(
        'El archivo no contiene la hoja "Carga". Utiliza la plantilla oficial.',
      );
    }

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
      header: 1,

      defval: '',

      raw: true,

      blankrows: false,
    });

    if (matriz.length === 0) {
      throw new Error('La hoja "Carga" está vacía.');
    }

    this.validarEncabezados(matriz[0] ?? []);

    const filas = matriz
      .slice(1)
      .map((valores, indice) => ({
        valores,

        filaExcel: indice + 2,
      }))
      .filter((fila) => !this.esFilaVacia(fila.valores))
      .map((fila) =>
        this.procesarFila(fila.valores, fila.filaExcel, categorias),
      );

    if (filas.length === 0) {
      throw new Error('La plantilla no contiene registros para importar.');
    }
    const filasValidas = filas.filter((fila) => fila.valido).length;

    const filasConError = filas.length - filasValidas;

    const filasPagadas = filas.filter(
      (fila) => fila.valido && fila.bCancelado === 1,
    );

    const filasProyectadas = filas.filter(
      (fila) => fila.valido && fila.bCancelado === 0,
    );

    const montoPagado = filasPagadas.reduce(
      (total, fila) => total + fila.monto,
      0,
    );

    const montoProyectado = filasProyectadas.reduce(
      (total, fila) => total + fila.monto,
      0,
    );

    return {
      nombreArchivo,

      totalFilas: filas.length,

      filasValidas,

      filasConError,

      totalPagados: filasPagadas.length,

      totalProyectados: filasProyectadas.length,

      montoPagado,

      montoProyectado,

      filas,
    };
  }

  private validarEncabezados(encabezados: unknown[]): void {
    const encabezadosValidos = [
      ['FECHA', 'DESCRIPCION', 'MONTO', 'CATEGORIA', 'YA SE PAGO'],
      ['FECHA', 'DATO', 'PRECIO', 'CLASIFICADOR', 'CANCELADO'],
    ];

    const recibidos = encabezados
      .slice(0, 5)
      .map((valor) => this.normalizarTexto(String(valor ?? '')));

    const validos = encabezadosValidos.some((encabezados) =>
      encabezados.every(
        (esperado, indice) => recibidos[indice] === esperado,
      ),
    );

    if (!validos) {
      throw new Error(
        'La estructura del Excel no es válida. Las columnas deben ser: FECHA, DESCRIPCIÓN, MONTO, CATEGORÍA y ¿YA SE PAGÓ?.',
      );
    }
  }
  private procesarFila(
    valores: unknown[],
    filaExcel: number,
    categorias: CategoriaMovimiento[],
  ): FilaCargaMasivaEgreso {
    const errores: string[] = [];

    const fecha = this.convertirFecha(valores[0]);

    const descripcion = this.limpiarTexto(valores[1]);

    const monto = this.convertirMonto(valores[2]);

    const clasificador = this.limpiarTexto(valores[3]);

    const bCancelado = this.convertirFlagCancelado(valores[4]);

    if (!fecha) {
      errores.push('La fecha no es válida.');
    }

    if (!descripcion) {
      errores.push('La descripción es obligatoria.');
    } else if (descripcion.length > 150) {
      errores.push('La descripción no puede superar los 150 caracteres.');
    }

    if (monto === null || monto <= 0) {
      errores.push('El monto debe ser mayor a cero.');
    }

    if (!clasificador) {
      errores.push('La categoría es obligatoria.');
    }

    if (bCancelado === null) {
      errores.push('Indica SÍ o NO en la columna ¿YA SE PAGÓ?.');
    }

    const categoria = clasificador
      ? categorias.find(
          (item) =>
            this.normalizarTexto(item.nombre) ===
            this.normalizarTexto(clasificador),
        )
      : undefined;

    if (clasificador && !categoria) {
      errores.push(
        `La categoría "${clasificador}" no existe como categoría activa de egreso.`,
      );
    }

    const flagFinal: FlagCancelado = bCancelado ?? 0;

    return {
      filaExcel,

      fechaMovimiento: fecha ?? '',

      descripcion,

      monto: monto ?? 0,

      clasificador,

      categoriaId: categoria?.id ?? null,

      categoria: categoria?.nombre ?? clasificador,

      bCancelado: flagFinal,

      estadoTexto: flagFinal === 1 ? 'Pagado' : 'Proyectado',

      valido: errores.length === 0,

      errores,
    };
  }

  private esFilaVacia(valores: unknown[]): boolean {
    return valores
      .slice(0, 4)
      .every((valor) => this.limpiarTexto(valor) === '');
  }

  private convertirFecha(valor: unknown): string | null {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      return this.crearFechaIso(
        valor.getFullYear(),
        valor.getMonth() + 1,
        valor.getDate(),
      );
    }

    if (typeof valor === 'number' && Number.isFinite(valor)) {
      const fechaExcel = XLSX.SSF.parse_date_code(valor);

      if (fechaExcel) {
        return this.crearFechaIso(fechaExcel.y, fechaExcel.m, fechaExcel.d);
      }
    }

    const texto = this.limpiarTexto(valor);

    if (!texto) {
      return null;
    }

    let coincidencia = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (coincidencia) {
      return this.crearFechaIso(
        Number(coincidencia[3]),
        Number(coincidencia[2]),
        Number(coincidencia[1]),
      );
    }

    coincidencia = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (coincidencia) {
      return this.crearFechaIso(
        Number(coincidencia[1]),
        Number(coincidencia[2]),
        Number(coincidencia[3]),
      );
    }

    return null;
  }

  private crearFechaIso(anio: number, mes: number, dia: number): string | null {
    const fecha = new Date(anio, mes - 1, dia);

    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {
      return null;
    }

    return [
      anio,
      String(mes).padStart(2, '0'),
      String(dia).padStart(2, '0'),
    ].join('-');
  }

  private convertirMonto(valor: unknown): number | null {
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      return valor;
    }

    let texto = this.limpiarTexto(valor);

    if (!texto) {
      return null;
    }

    texto = texto.replace(/S\/\.?/gi, '').replace(/\s/g, '');

    const ultimoPunto = texto.lastIndexOf('.');

    const ultimaComa = texto.lastIndexOf(',');

    if (ultimoPunto !== -1 && ultimaComa !== -1) {
      if (ultimaComa > ultimoPunto) {
        texto = texto.replace(/\./g, '').replace(',', '.');
      } else {
        texto = texto.replace(/,/g, '');
      }
    } else if (ultimaComa !== -1) {
      texto = texto.replace(',', '.');
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : null;
  }

  private limpiarTexto(valor: unknown): string {
    return String(valor ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private convertirFlagCancelado(valor: unknown): FlagCancelado | null {
    if (typeof valor === 'boolean') {
      return valor ? 1 : 0;
    }

    if (typeof valor === 'number' && Number.isFinite(valor)) {
      if (valor === 1) {
        return 1;
      }

      if (valor === 0) {
        return 0;
      }

      return null;
    }

    const texto = this.normalizarTexto(String(valor ?? ''));

    const valoresCancelados = [
      '1',
      'SI',
      'TRUE',
      'VERDADERO',
      'X',
      '☑',
      'CANCELADO',
      'PAGADO',
    ];

    const valoresProyectados = [
      '',
      '0',
      'NO',
      'FALSE',
      'FALSO',
      '☐',
      'PROYECTADO',
    ];

    if (valoresCancelados.includes(texto)) {
      return 1;
    }

    if (valoresProyectados.includes(texto)) {
      return 0;
    }

    return null;
  }
}
