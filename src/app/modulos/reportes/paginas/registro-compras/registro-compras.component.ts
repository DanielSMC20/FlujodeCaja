import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BehaviorSubject, catchError, EMPTY, finalize, switchMap } from 'rxjs';

import {
  FileSpreadsheet,
  LucideAngularModule,
  ReceiptText,
  RotateCcw,
  Search,
} from 'lucide-angular';

import * as XLSX from 'xlsx-js-style';

import {
  FiltroMovimientos,
  Movimiento,
} from '../../../../nucleo/modelos/movimiento';

import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';

import { SesionEmpresaService } from '../../../../nucleo/servicios/sesion-empresa.service';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

type EstadoCompra = 'todos' | 'pagado' | 'proyectado';

@Component({
  selector: 'app-registro-compras',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    LucideAngularModule,
    MonedaSolPipe,
  ],

  templateUrl: './registro-compras.component.html',

  styleUrl: './registro-compras.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroComprasComponent {
  /* =========================================================
     DEPENDENCIAS
     ========================================================= */

  private readonly formBuilder = inject(FormBuilder);

  private readonly movimientoService = inject(MovimientoService);

  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  /* =========================================================
     ICONOS
     ========================================================= */

  readonly iconos = {
    compras: ReceiptText,

    excel: FileSpreadsheet,

    buscar: Search,

    limpiar: RotateCcw,
  };

  /* =========================================================
     ESTADO
     ========================================================= */

  cargando = false;

  errorFiltro = '';

  /* =========================================================
     FECHAS INICIALES
     ========================================================= */

  private readonly fechasIniciales = this.obtenerFechasIniciales();

  /* =========================================================
     FORMULARIO
     ========================================================= */

  readonly formulario = this.formBuilder.nonNullable.group({
    fechaDesde: [this.fechasIniciales.fechaDesde],

    fechaHasta: [this.fechasIniciales.fechaHasta],

    estado: ['todos' as EstadoCompra],
  });

  /* =========================================================
     FILTRO
     ========================================================= */

  private readonly filtroSubject = new BehaviorSubject<FiltroMovimientos>(
    this.construirFiltro(),
  );

  /* =========================================================
     REGISTRO DE COMPRAS
     ========================================================= */

  readonly compras$ = this.filtroSubject.pipe(
    switchMap((filtro) => {
      this.cargando = true;

      this.changeDetectorRef.markForCheck();

      return this.movimientoService.listarMovimientosFiltrados(filtro).pipe(
        catchError((error) => {
          void import('sweetalert2').then(({ default: Swal }) =>
            Swal.fire({
              icon: 'error',

              title: 'No se pudo cargar el registro de compras',

              text:
                error instanceof Error
                  ? error.message
                  : 'Ocurrió un error al consultar los egresos.',

              confirmButtonText: 'Aceptar',

              heightAuto: false,
            }),
          );

          return EMPTY;
        }),

        finalize(() => {
          this.cargando = false;

          this.changeDetectorRef.markForCheck();
        }),
      );
    }),
  );

  /* =========================================================
     EMPRESA
     ========================================================= */

  get nombreEmpresa(): string {
    const empresa = this.sesionEmpresaService.empresaActual;

    return (
      empresa.razonSocial?.trim() ||
      empresa.nombreComercial?.trim() ||
      'Empresa'
    );
  }

  get rucEmpresa(): string {
    const empresa = this.sesionEmpresaService.empresaActual as unknown as {
      ruc?: string | null;

      cRuc?: string | null;
    };

    return empresa.ruc?.trim() || empresa.cRuc?.trim() || '';
  }

  /* =========================================================
     FILTRAR
     ========================================================= */

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();

    if (!datos.fechaDesde || !datos.fechaHasta) {
      this.errorFiltro = 'Selecciona la fecha inicial y la fecha final.';

      return;
    }

    if (datos.fechaDesde > datos.fechaHasta) {
      this.errorFiltro =
        'La fecha inicial no puede ser mayor que la fecha final.';

      return;
    }

    this.errorFiltro = '';

    this.filtroSubject.next(this.construirFiltro());
  }

  /* =========================================================
     LIMPIAR
     ========================================================= */

  limpiarFiltros(): void {
    const fechas = this.obtenerFechasIniciales();

    this.formulario.setValue({
      fechaDesde: fechas.fechaDesde,

      fechaHasta: fechas.fechaHasta,

      estado: 'todos',
    });

    this.errorFiltro = '';

    this.filtroSubject.next(this.construirFiltro());
  }

  /* =========================================================
     PERIODO
     ========================================================= */

  obtenerPeriodo(movimiento: Movimiento): string {
    const fecha = this.obtenerFechaCompra(movimiento);

    if (!fecha) {
      return '—';
    }

    return fecha.substring(0, 4);
  }

  /* =========================================================
     MES
     ========================================================= */

  obtenerMes(movimiento: Movimiento): string {
    const fecha = this.obtenerFechaCompra(movimiento);

    if (!fecha) {
      return '—';
    }

    return fecha.substring(5, 7);
  }

  /* =========================================================
     TIPO DOCUMENTO SUNAT
     ========================================================= */

  obtenerTipoDocumento(movimiento: Movimiento): string {
  switch (movimiento.tipoComprobante) {
    case 1:
      // Factura
      return '01';

    case 2:
      // Boleta de venta
      return '03';

    case 3:
      // Recibo por honorarios
      return '02';

    case 4:
      // Ticket o nota de venta
      return '12';

    case 5:
      // Sin comprobante
      return '—';

    default:
      return '—';
  }
}

  /* =========================================================
     SERIE
     ========================================================= */

  obtenerSerie(movimiento: Movimiento): string {
    return movimiento.serieComprobante?.trim() || '—';
  }

  /* =========================================================
     NÚMERO
     ========================================================= */

  obtenerNumero(movimiento: Movimiento): string {
    return movimiento.numeroComprobante?.trim() || '—';
  }

  /* =========================================================
     PROVEEDOR
     ========================================================= */

  obtenerProveedor(movimiento: Movimiento): string {
    return movimiento.razonSocialEmisor?.trim() || '—';
  }

  /* =========================================================
     RUC
     ========================================================= */

  obtenerRuc(movimiento: Movimiento): string {
    return movimiento.documentoEmisor?.trim() || '—';
  }

  /* =========================================================
     GLOSA
     ========================================================= */

  obtenerGlosa(movimiento: Movimiento): string {
    return (
      movimiento.descripcion?.trim() || movimiento.categoria?.trim() || '—'
    );
  }

  /* =========================================================
     MONEDA
     ========================================================= */

  obtenerMoneda(movimiento: Movimiento): string {
    /*
     * Formato utilizado por el archivo del contador.
     *
     * S = Soles
     * D = Dólares
     */

    if (movimiento.moneda === 1) {
      return 'S';
    }

    if (movimiento.moneda === 2) {
      return 'D';
    }

    return '—';
  }

  /* =========================================================
     TIPO DE CAMBIO
     ========================================================= */

  obtenerTipoCambio(movimiento: Movimiento): number {
    if (movimiento.tipoCambio != null) {
      return Number(movimiento.tipoCambio);
    }

    /*
     * Para soles el archivo contable usa 1.
     */

    if (movimiento.moneda === 1) {
      return 1;
    }

    return 0;
  }

  /* =========================================================
     FECHA COMPRA
     ========================================================= */

  obtenerFechaCompra(movimiento: Movimiento): string {
    const fechaComprobante = movimiento.fechaComprobante?.trim();

    if (fechaComprobante) {
      return fechaComprobante;
    }

    return movimiento.fechaMovimiento;
  }

  /* =========================================================
     ESTADO
     ========================================================= */

  obtenerEstado(movimiento: Movimiento): string {
    return movimiento.cancelado === true || movimiento.bCancelado === 1
      ? 'Pagado'
      : 'Proyectado';
  }

  claseEstado(movimiento: Movimiento): string {
    return this.obtenerEstado(movimiento) === 'Pagado'
      ? 'estado-pagado'
      : 'estado-proyectado';
  }

  /* =========================================================
     ORIGEN
     ========================================================= */

  obtenerOrigen(movimiento: Movimiento): string {
    if (movimiento.origenRegistro === 2) {
      return 'XML';
    }

    if (movimiento.origenRegistro === 3) {
      return 'Excel';
    }

    return 'Manual';
  }

  /* =========================================================
     NUMÉRICO
     ========================================================= */

  valorNumerico(valor: number | null | undefined): number {
    if (valor == null) {
      return 0;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : 0;
  }

  /* =========================================================
     TOTAL COMPRAS
     ========================================================= */

  totalCompras(compras: Movimiento[]): number {
    return compras.reduce(
      (total, movimiento) => total + Number(movimiento.monto ?? 0),

      0,
    );
  }

  /* =========================================================
     TOTAL BASE IMPONIBLE
     ========================================================= */

  totalBaseImponible(compras: Movimiento[]): number {
    return compras.reduce(
      (total, movimiento) =>
        total + this.valorNumerico(movimiento.baseImponible),

      0,
    );
  }

  /* =========================================================
     TOTAL IGV
     ========================================================= */

  totalIgv(compras: Movimiento[]): number {
    return compras.reduce(
      (total, movimiento) => total + this.valorNumerico(movimiento.igv),

      0,
    );
  }

  /* =========================================================
     TOTAL INAFECTO
     ========================================================= */

  totalInafecto(compras: Movimiento[]): number {
    return compras.reduce(
      (total, movimiento) => total + this.valorNumerico(movimiento.inafecto),

      0,
    );
  }

  /* =========================================================
     FORMATEAR FECHA
     ========================================================= */

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return '—';
    }

    const partes = fecha.substring(0, 10).split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/` + `${partes[1]}/` + `${partes[0]}`;
  }

  /* =========================================================
     PERIODO ACTUAL
     ========================================================= */

  get periodoSeleccionado(): string {
    const datos = this.formulario.getRawValue();

    return (
      `${this.formatearFecha(datos.fechaDesde)}` +
      ' al ' +
      `${this.formatearFecha(datos.fechaHasta)}`
    );
  }

  /* =========================================================
     EXPORTAR EXCEL
     ========================================================= */

  exportarExcel(compras: Movimiento[]): void {
    if (!compras.length) {
      return;
    }

    const empresa = this.sesionEmpresaService.empresaActual;

    const razonSocial =
      empresa.razonSocial?.trim() ||
      empresa.nombreComercial?.trim() ||
      'Empresa';

    const empresaTitulo = this.rucEmpresa
      ? `Empresa: ${this.rucEmpresa} - ${razonSocial}`
      : `Empresa: ${razonSocial}`;

    /*
     * Se eliminan del archivo original:
     *
     * S_D
     * ASI
     * F_ASIENTO
     *
     * Por ello quedan exactamente
     * 26 columnas, A hasta Z.
     */

    const cabeceras = [
      'PERIODO',
      'MES',
      'T_DOC',
      'SERIE',
      'NUMERO',
      'F_DOC',
      'F_VEN',
      'RUC',
      'RAZON_SOCIAL',
      'BASE_IMP',
      'IGV',
      'BASE_IMP2',
      'IGV2',
      'BASE_IMP3',
      'IGV3',
      'INAFECTO',
      'ISC',
      'ICBPER',
      'EXONERADO',
      'TOTAL',
      'MONEDA',
      'P_IGV',
      'T_C',
      'D_DETRAC',
      'F_DETRAC',
      'GLOSA',
    ];

    const filas: unknown[][] = [
      [],

      [empresaTitulo],

      ['Titulo: REGISTRO DE COMPRAS'],

      [],

      cabeceras,

      ...compras.map((movimiento) => [
        this.obtenerPeriodo(movimiento),

        this.obtenerMes(movimiento),

        this.obtenerTipoDocumento(movimiento),

        this.obtenerSerie(movimiento),

        this.obtenerNumero(movimiento),

        this.formatearFecha(
          movimiento.fechaComprobante ?? movimiento.fechaMovimiento,
        ),

        movimiento.fechaVencimiento
          ? this.formatearFecha(movimiento.fechaVencimiento)
          : '',

        movimiento.documentoEmisor ?? '',

        movimiento.razonSocialEmisor ?? '',

        this.valorNumerico(movimiento.baseImponible),

        this.valorNumerico(movimiento.igv),

        /*
         * Segunda base / IGV:
         * aún no se manejan.
         */
        0,

        0,

        /*
         * Tercera base / IGV:
         * aún no se manejan.
         */
        0,

        0,

        this.valorNumerico(movimiento.inafecto),

        this.valorNumerico(movimiento.isc),

        this.valorNumerico(movimiento.icbper),

        this.valorNumerico(movimiento.exonerado),

        this.valorNumerico(movimiento.monto),

        this.obtenerMoneda(movimiento),

        this.valorNumerico(movimiento.porcentajeIgv),

        this.obtenerTipoCambio(movimiento),

        /*
         * D_DETRAC
         */
        '',

        /*
         * F_DETRAC
         */
        '',

        this.obtenerGlosa(movimiento),
      ]),
    ];

    const hoja = XLSX.utils.aoa_to_sheet(filas);

    /* =======================================================
       MERGES
       ======================================================= */

    hoja['!merges'] = [
      XLSX.utils.decode_range('A2:Z2'),

      XLSX.utils.decode_range('A3:Z3'),
    ];

    /* =======================================================
       ANCHO DE COLUMNAS
       ======================================================= */

    hoja['!cols'] = [
      { wch: 10 }, // PERIODO
      { wch: 7 }, // MES
      { wch: 8 }, // T_DOC
      { wch: 15 }, // SERIE
      { wch: 18 }, // NUMERO
      { wch: 12 }, // F_DOC
      { wch: 12 }, // F_VEN
      { wch: 15 }, // RUC
      { wch: 38 }, // RAZON SOCIAL
      { wch: 14 }, // BASE
      { wch: 12 }, // IGV
      { wch: 14 }, // BASE 2
      { wch: 12 }, // IGV 2
      { wch: 14 }, // BASE 3
      { wch: 12 }, // IGV 3
      { wch: 14 }, // INAFECTO
      { wch: 12 }, // ISC
      { wch: 12 }, // ICBPER
      { wch: 14 }, // EXONERADO
      { wch: 14 }, // TOTAL
      { wch: 10 }, // MONEDA
      { wch: 10 }, // P IGV
      { wch: 10 }, // TC
      { wch: 16 }, // DETRAC
      { wch: 14 }, // F DETRAC
      { wch: 45 }, // GLOSA
    ];

    /* =======================================================
       ALTURA
       ======================================================= */

    hoja['!rows'] = [
      {
        hpt: 5,
      },

      {
        hpt: 22,
      },

      {
        hpt: 22,
      },

      {
        hpt: 8,
      },

      {
        hpt: 32,
      },
    ];

    /* =======================================================
       EMPRESA
       ======================================================= */

    this.aplicarEstilo(hoja, 'A2:Z2', {
      font: {
        name: 'Calibri',

        sz: 11,

        bold: true,

        color: {
          rgb: '1F2937',
        },
      },

      alignment: {
        horizontal: 'left',

        vertical: 'center',
      },
    });

    /* =======================================================
       TÍTULO
       ======================================================= */

    this.aplicarEstilo(hoja, 'A3:Z3', {
      font: {
        name: 'Calibri',

        sz: 11,

        bold: true,

        color: {
          rgb: '1F2937',
        },
      },

      alignment: {
        horizontal: 'left',

        vertical: 'center',
      },
    });

    /* =======================================================
       CABECERA
       ======================================================= */

    this.aplicarEstilo(hoja, 'A5:Z5', {
      fill: {
        patternType: 'solid',

        fgColor: {
          rgb: 'D9E2F3',
        },
      },

      font: {
        name: 'Calibri',

        sz: 9,

        bold: true,

        color: {
          rgb: '1F2937',
        },
      },

      alignment: {
        horizontal: 'center',

        vertical: 'center',

        wrapText: true,
      },

      border: {
        top: {
          style: 'thin',

          color: {
            rgb: 'B4C7E7',
          },
        },

        bottom: {
          style: 'thin',

          color: {
            rgb: 'B4C7E7',
          },
        },

        left: {
          style: 'thin',

          color: {
            rgb: 'B4C7E7',
          },
        },

        right: {
          style: 'thin',

          color: {
            rgb: 'B4C7E7',
          },
        },
      },
    });

    /* =======================================================
       DETALLE
       ======================================================= */

    const primeraFila = 6;

    const ultimaFila = 5 + compras.length;

    for (let fila = primeraFila; fila <= ultimaFila; fila++) {
      this.aplicarEstilo(hoja, `A${fila}:Z${fila}`, {
        font: {
          name: 'Calibri',

          sz: 9,

          color: {
            rgb: '334155',
          },
        },

        alignment: {
          vertical: 'center',
        },

        border: {
          bottom: {
            style: 'thin',

            color: {
              rgb: 'E2E8F0',
            },
          },
        },
      });

      /*
       * Columnas monetarias:
       *
       * J hasta T,
       * exceptuando U que es moneda.
       */

      const columnasImporte = [
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
      ];

      for (const columna of columnasImporte) {
        const celda = hoja[`${columna}${fila}`];

        if (celda) {
          celda.z = '#,##0.00';

          celda.s = {
            ...celda.s,

            alignment: {
              horizontal: 'right',

              vertical: 'center',
            },
          };
        }
      }

      /*
       * P_IGV
       */
      const porcentaje = hoja[`V${fila}`];

      if (porcentaje) {
        porcentaje.z = '0.00';
      }

      /*
       * Tipo de cambio
       */
      const tipoCambio = hoja[`W${fila}`];

      if (tipoCambio) {
        tipoCambio.z = '0.000';
      }
    }

    /* =======================================================
       AUTOFILTRO
       ======================================================= */

    hoja['!autofilter'] = {
      ref: `A5:Z${ultimaFila}`,
    };

    /* =======================================================
       LIBRO
       ======================================================= */

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, 'Registro de compras');

    const filtros = this.formulario.getRawValue();

    XLSX.writeFile(
      libro,

      `registro-compras-${filtros.fechaDesde}-${filtros.fechaHasta}.xlsx`,
    );
  }

  /* =========================================================
     CONSTRUIR FILTRO
     ========================================================= */

  private construirFiltro(): FiltroMovimientos {
    const datos = this.formulario.getRawValue();

    return {
      tipoMovimiento: 2,

      fechaDesde: datos.fechaDesde,

      fechaHasta: datos.fechaHasta,

      cancelado:
        datos.estado === 'pagado'
          ? true
          : datos.estado === 'proyectado'
            ? false
            : undefined,

      soloActivos: true,
    };
  }

  /* =========================================================
     ESTILO EXCEL
     ========================================================= */

  private aplicarEstilo(
    hoja: XLSX.WorkSheet,

    rango: string,

    estilo: Record<string, unknown>,
  ): void {
    const limites = XLSX.utils.decode_range(rango);

    for (let fila = limites.s.r; fila <= limites.e.r; fila++) {
      for (let columna = limites.s.c; columna <= limites.e.c; columna++) {
        const referencia = XLSX.utils.encode_cell({
          r: fila,

          c: columna,
        });

        if (!hoja[referencia]) {
          hoja[referencia] = {
            t: 's',

            v: '',
          };
        }

        hoja[referencia].s = estilo;
      }
    }
  }

  /* =========================================================
     FECHAS INICIALES
     ========================================================= */

  private obtenerFechasIniciales(): {
    fechaDesde: string;

    fechaHasta: string;
  } {
    const hoy = new Date();

    const anio = hoy.getFullYear();

    const mes = String(hoy.getMonth() + 1).padStart(2, '0');

    const dia = String(hoy.getDate()).padStart(2, '0');

    return {
      fechaDesde: `${anio}-${mes}-01`,

      fechaHasta: `${anio}-${mes}-${dia}`,
    };
  }
}
