import { AsyncPipe, CommonModule } from '@angular/common';

import {DestroyRef,ChangeDetectionStrategy,Component,inject,  ChangeDetectorRef,} from '@angular/core';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { SesionEmpresaService } from '../../../../nucleo/servicios/sesion-empresa.service';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,catchError,
EMPTY,
finalize,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FiltroReporteMovimientos,
  ResultadoReporteMovimientos,
} from '../../../../nucleo/modelos/reporte.model';

import * as XLSX from 'xlsx-js-style';

import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';

import { ConstanteService } from '../../../../nucleo/servicios/constante.service';

import { ReporteService } from '../../../../nucleo/servicios/reporte.service';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

import { ChartNoAxesCombined, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-reportes',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './reportes.component.html',

  styleUrl: './reportes.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesComponent {

  private readonly sesionEmpresaService =
  inject(SesionEmpresaService);

get empresaActual() {
  return this.sesionEmpresaService.empresaActual;
}
private readonly destroyRef =
  inject(DestroyRef);

private readonly changeDetectorRef =
  inject(ChangeDetectorRef);

cargandoReporte = false;
  readonly ChartNoAxesCombined = ChartNoAxesCombined;

  private readonly formBuilder = inject(FormBuilder);

  private readonly reporteService = inject(ReporteService);

  private readonly categoriaService = inject(CategoriaService);

  readonly constanteService = inject(ConstanteService);
  readonly tiposMovimiento$ =
  this.constanteService.obtenerConstante(100);

  private readonly fechasIniciales = this.obtenerFechasIniciales();

 readonly formulario =
  this.formBuilder.nonNullable.group({
    fechaDesde: [
      this.fechasIniciales.fechaDesde
    ],

    fechaHasta: [
      this.fechasIniciales.fechaHasta
    ],

    tipoMovimiento: [0],

    categoriaId: [0],

    estadoEgreso: ['todos'],
    incluirAnulados: [false],
  });

  private readonly filtroSubject =
    new BehaviorSubject<FiltroReporteMovimientos>({
      fechaDesde: this.fechasIniciales.fechaDesde,

      fechaHasta: this.fechasIniciales.fechaHasta,
    });

  readonly reporte$ =
  this.filtroSubject.pipe(
    switchMap((filtro) => {
      this.cargandoReporte = true;

      this.changeDetectorRef.markForCheck();

      return this.reporteService
        .obtenerReporteMovimientos(filtro)
        .pipe(
          catchError((error) => {
            void import('sweetalert2').then(
              ({ default: Swal }) =>
                Swal.fire({
                  icon: 'error',
                  title:
                    'No se pudo cargar el reporte',
                  text:
                    error instanceof Error
                      ? error.message
                      : 'Ocurrió un error al consultar los movimientos.',
                  confirmButtonText: 'Aceptar',
                  heightAuto: false,
                }),
            );

            return EMPTY;
          }),

          finalize(() => {
            this.cargandoReporte = false;

            this.changeDetectorRef.markForCheck();
          }),
        );
    }),
  );

  private readonly tipoMovimientoSubject = new BehaviorSubject<number>(0);

readonly categorias$ = this.tipoMovimientoSubject.pipe(
  switchMap((tipoMovimiento) => {
    if (tipoMovimiento === 1 || tipoMovimiento === 2) {
      return this.categoriaService.listarCategoriasPorTipo(
        tipoMovimiento,
      );
    }

    return combineLatest([
      this.categoriaService.listarCategoriasPorTipo(1),
      this.categoriaService.listarCategoriasPorTipo(2),
    ]).pipe(
      map(([ingresos, egresos]) => [
        ...ingresos,
        ...egresos,
      ]),
    );
  }),

  map((categorias) =>
    categorias
      .filter((categoria) => categoria.estado)
      .sort((primero, segundo) =>
        primero.nombre.localeCompare(
          segundo.nombre,
          'es',
          { sensitivity: 'base' },
        ),
      ),
  ),

  shareReplay({
    bufferSize: 1,
    refCount: true,
  }),
);

constructor() {
  this.formulario.controls.estadoEgreso.disable({
    emitEvent: false,
  });

  this.formulario.controls.tipoMovimiento.valueChanges
    .pipe(
      takeUntilDestroyed(
        this.destroyRef,
      ),
    )
    .subscribe((tipoMovimiento) => {
      this.tipoMovimientoSubject.next(
        tipoMovimiento,
      );

      this.formulario.controls.categoriaId.setValue(
        0,
        {
          emitEvent: false,
        },
      );

      if (tipoMovimiento === 2) {
        this.formulario.controls.estadoEgreso.enable({
          emitEvent: false,
        });
      } else {
        this.formulario.controls.estadoEgreso.setValue(
          'todos',
          {
            emitEvent: false,
          },
        );

        this.formulario.controls.estadoEgreso.disable({
          emitEvent: false,
        });
      }
    });

  this.formulario.valueChanges
    .pipe(
      debounceTime(350),

      map(() =>
        this.construirFiltro(),
      ),

      filter(
        (
          filtro,
        ): filtro is FiltroReporteMovimientos =>
          filtro !== null,
      ),

      distinctUntilChanged(
        (anterior, actual) =>
          JSON.stringify(anterior)
          === JSON.stringify(actual),
      ),

      takeUntilDestroyed(
        this.destroyRef,
      ),
    )
    .subscribe((filtro) => {
      this.filtroSubject.next(
        filtro,
      );
    });
}

aplicarFiltros(): void {
  const filtro =
    this.construirFiltro();

  if (filtro) {
    this.filtroSubject.next(
      filtro,
    );
  }
}

limpiarFiltros(): void {
  const fechas =
    this.obtenerFechasIniciales();

  this.formulario.setValue({
    fechaDesde: fechas.fechaDesde,
    fechaHasta: fechas.fechaHasta,
    tipoMovimiento: 0,
    categoriaId: 0,
    estadoEgreso: 'todos',
    incluirAnulados: false,
  });

  this.formulario.controls.estadoEgreso.disable({
    emitEvent: false,
  });
}


  etiquetaTipoMovimiento(tipoMovimiento: number): string {
    return this.constanteService.obtenerDescripcion(100, tipoMovimiento);
  }

  etiquetaMedioPago(medioPago: number): string {
    return this.constanteService.obtenerDescripcion(200, medioPago);
  }

exportarExcel(
  reporte: ResultadoReporteMovimientos,
): void {
  const empresa =
    this.sesionEmpresaService.empresaActual;

  const filtros =
    this.formulario.getRawValue();

  const razonSocial =
    empresa.razonSocial?.trim()
    || empresa.nombreComercial?.trim()
    || 'Empresa';

  const periodo =
    `${this.formatearFecha(filtros.fechaDesde)} al `
    + `${this.formatearFecha(filtros.fechaHasta)}`;

  const fechaGeneracion =
    this.obtenerFechaHoraActual();

  const netoProyectado =
    reporte.resumen.netoReal
    - reporte.resumen.totalEgresosProyectados;

  const tipoSeleccionado =
    filtros.tipoMovimiento === 1
      ? 'Ingresos'
      : filtros.tipoMovimiento === 2
        ? 'Egresos'
        : 'Todos';

  const estadoSeleccionado =
    filtros.tipoMovimiento === 2
      ? filtros.estadoEgreso === 'pagado'
        ? 'Pagados'
        : filtros.estadoEgreso === 'proyectado'
          ? 'Proyectados'
          : 'Todos'
      : 'No aplica';

  const clasificadorSeleccionado =
    filtros.categoriaId > 0
      ? this.categoriaService
          .obtenerCategoriaPorId(
            filtros.categoriaId,
          )?.nombre ?? 'Seleccionado'
      : 'Todos';

  /*
   * Usamos un formato numérico simple y compatible.
   * El símbolo S/ se coloca en las etiquetas para evitar
   * nuevamente el problema de styles.xml.
   */
  const formatoMonto =
    '#,##0.00';

  const bordeSuave = {
    top: {
      style: 'thin',
      color: { rgb: 'D9E2F3' },
    },
    bottom: {
      style: 'thin',
      color: { rgb: 'D9E2F3' },
    },
    left: {
      style: 'thin',
      color: { rgb: 'D9E2F3' },
    },
    right: {
      style: 'thin',
      color: { rgb: 'D9E2F3' },
    },
  };

  const estiloTitulo = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: '17365D' },
    },
    font: {
      name: 'Calibri',
      sz: 16,
      bold: true,
      color: { rgb: 'FFFFFF' },
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
  };

  const estiloEmpresa = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: 'DCE6F1' },
    },
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: '17365D' },
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
  };

  const estiloSeccion = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: '2F75B5' },
    },
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: 'FFFFFF' },
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center',
    },
  };

  const estiloEtiqueta = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: 'EAF2F8' },
    },
    font: {
      name: 'Calibri',
      sz: 10,
      bold: true,
      color: { rgb: '44546A' },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    },
    border: bordeSuave,
  };

  const estiloValor = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: 'FFFFFF' },
    },
    font: {
      name: 'Calibri',
      sz: 14,
      bold: true,
      color: { rgb: '1F2937' },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
    },
    border: bordeSuave,
    numFmt: formatoMonto,
  };

  /*
   * HOJA RESUMEN
   */

  const filasResumen: unknown[][] = [
    [
      'REPORTE DE MOVIMIENTOS',
      '', '', '', '', '', '', '',
    ],
    [
      razonSocial,
      '', '', '', '', '', '', '',
    ],
    ['', '', '', '', '', '', '', ''],
    [
      'RUC',
      empresa.ruc || 'No registrado',
      '',
      'Periodo',
      periodo,
      '', '', '',
    ],
    [
      'Generado',
      fechaGeneracion,
      '', '', '', '', '', '',
    ],
    ['', '', '', '', '', '', '', ''],
    [
      'RESUMEN FINANCIERO',
      '', '', '', '', '', '', '',
    ],
    ['', '', '', '', '', '', '', ''],
    [
      'Ingresos (S/)',
      '',
      'Egresos pagados (S/)',
      '',
      'Egresos proyectados (S/)',
      '',
      'Neto real (S/)',
      '',
    ],
    [
      reporte.resumen.totalIngresos,
      '',
      reporte.resumen.totalEgresosPagados,
      '',
      reporte.resumen.totalEgresosProyectados,
      '',
      reporte.resumen.netoReal,
      '',
    ],
    ['', '', '', '', '', '', '', ''],
    [
      'Neto proyectado (S/)',
      '',
      'Movimientos',
      '',
      'Anulados',
      '',
      'Moneda',
      '',
    ],
    [
      netoProyectado,
      '',
      reporte.resumen.cantidadRegistros,
      '',
      reporte.resumen.cantidadAnulados,
      '',
      'Soles (PEN)',
      '',
    ],
    ['', '', '', '', '', '', '', ''],
    [
      'FILTROS APLICADOS',
      '', '', '', '', '', '', '',
    ],
    [
      'Tipo',
      tipoSeleccionado,
      '',
      'Clasificador',
      clasificadorSeleccionado,
      '', '', '',
    ],
    [
      'Estado',
      estadoSeleccionado,
      '',
      'Periodo',
      periodo,
      '', '', '',
    ],
  ];

  const hojaResumen =
    XLSX.utils.aoa_to_sheet(
      filasResumen,
    );

  hojaResumen['!merges'] = [
    XLSX.utils.decode_range('A1:H1'),
    XLSX.utils.decode_range('A2:H2'),

    XLSX.utils.decode_range('B4:C4'),
    XLSX.utils.decode_range('E4:H4'),
    XLSX.utils.decode_range('B5:H5'),

    XLSX.utils.decode_range('A7:H7'),

    XLSX.utils.decode_range('A9:B9'),
    XLSX.utils.decode_range('C9:D9'),
    XLSX.utils.decode_range('E9:F9'),
    XLSX.utils.decode_range('G9:H9'),

    XLSX.utils.decode_range('A10:B10'),
    XLSX.utils.decode_range('C10:D10'),
    XLSX.utils.decode_range('E10:F10'),
    XLSX.utils.decode_range('G10:H10'),

    XLSX.utils.decode_range('A12:B12'),
    XLSX.utils.decode_range('C12:D12'),
    XLSX.utils.decode_range('E12:F12'),
    XLSX.utils.decode_range('G12:H12'),

    XLSX.utils.decode_range('A13:B13'),
    XLSX.utils.decode_range('C13:D13'),
    XLSX.utils.decode_range('E13:F13'),
    XLSX.utils.decode_range('G13:H13'),

    XLSX.utils.decode_range('A15:H15'),

    XLSX.utils.decode_range('B16:C16'),
    XLSX.utils.decode_range('E16:H16'),

    XLSX.utils.decode_range('B17:C17'),
    XLSX.utils.decode_range('E17:H17'),
  ];

  hojaResumen['!cols'] = [
    { wch: 20 },
    { wch: 17 },
    { wch: 20 },
    { wch: 17 },
    { wch: 22 },
    { wch: 17 },
    { wch: 20 },
    { wch: 17 },
  ];

  hojaResumen['!rows'] = [
    { hpt: 30 },
    { hpt: 23 },
    { hpt: 8 },
    { hpt: 21 },
    { hpt: 21 },
    { hpt: 8 },
    { hpt: 23 },
    { hpt: 8 },
    { hpt: 32 },
    { hpt: 30 },
    { hpt: 8 },
    { hpt: 32 },
    { hpt: 30 },
  ];

  this.aplicarEstiloExcel(
    hojaResumen,
    'A1:H1',
    estiloTitulo,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A2:H2',
    estiloEmpresa,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A7:H7',
    estiloSeccion,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A15:H15',
    estiloSeccion,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A9:H9',
    estiloEtiqueta,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A12:H12',
    estiloEtiqueta,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A10:H10',
    estiloValor,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A13:H13',
    estiloValor,
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A4:H5',
    {
      font: {
        name: 'Calibri',
        sz: 10,
        color: { rgb: '44546A' },
      },
      alignment: {
        vertical: 'center',
      },
    },
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A16:H17',
    {
      font: {
        name: 'Calibri',
        sz: 10,
        color: { rgb: '44546A' },
      },
      alignment: {
        vertical: 'center',
      },
      border: bordeSuave,
    },
  );

  /*
   * Colores financieros.
   */

  this.aplicarEstiloExcel(
    hojaResumen,
    'A10:B10',
    {
      ...estiloValor,
      font: {
        name: 'Calibri',
        sz: 14,
        bold: true,
        color: { rgb: '15803D' },
      },
    },
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'C10:F10',
    {
      ...estiloValor,
      font: {
        name: 'Calibri',
        sz: 14,
        bold: true,
        color: { rgb: 'DC2626' },
      },
    },
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'G10:H10',
    {
      ...estiloValor,
      font: {
        name: 'Calibri',
        sz: 14,
        bold: true,
        color: {
          rgb:
            reporte.resumen.netoReal >= 0
              ? '15803D'
              : 'DC2626',
        },
      },
    },
  );

  this.aplicarEstiloExcel(
    hojaResumen,
    'A13:B13',
    {
      ...estiloValor,
      font: {
        name: 'Calibri',
        sz: 14,
        bold: true,
        color: {
          rgb:
            netoProyectado >= 0
              ? '15803D'
              : 'DC2626',
        },
      },
    },
  );

  /*
   * HOJA MOVIMIENTOS
   */

  const encabezados = [
    'Fecha',
    'Tipo',
    'Clasificador',
    'Descripción',
    'Estado',
    'Medio de pago',
    'Monto (S/)',
    'Origen',
    'Observación',
  ];

  const movimientos: unknown[][] =
    reporte.movimientos.map(
      (movimiento) => [
        this.convertirFechaExcel(
          movimiento.fechaMovimiento,
        ),
        movimiento.tipoMovimientoDescripcion,
        movimiento.categoria,
        movimiento.descripcion,
        movimiento.estado,
        movimiento.medioPagoDescripcion,
        movimiento.monto,
        movimiento.origenRegistroDescripcion,
        movimiento.observacion || '',
      ],
    );

  const filasDetalle: unknown[][] = [
    [
      'DETALLE DE MOVIMIENTOS',
      '', '', '', '', '', '', '', '',
    ],
    [
      razonSocial,
      '', '', '', '', '', '', '', '',
    ],
    [
      `Periodo: ${periodo}`,
      '', '', '', '', '', '', '', '',
    ],
    ['', '', '', '', '', '', '', '', ''],
    encabezados,
    ...movimientos,
  ];

  const hojaMovimientos =
    XLSX.utils.aoa_to_sheet(
      filasDetalle,
      {
        cellDates: true,
      },
    );

  hojaMovimientos['!merges'] = [
    XLSX.utils.decode_range('A1:I1'),
    XLSX.utils.decode_range('A2:I2'),
    XLSX.utils.decode_range('A3:I3'),
  ];

  hojaMovimientos['!cols'] = [
    { wch: 13 },
    { wch: 13 },
    { wch: 22 },
    { wch: 38 },
    { wch: 16 },
    { wch: 20 },
    { wch: 15 },
    { wch: 23 },
    { wch: 38 },
  ];

  hojaMovimientos['!rows'] = [
    { hpt: 30 },
    { hpt: 22 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 25 },
  ];

  this.aplicarEstiloExcel(
    hojaMovimientos,
    'A1:I1',
    estiloTitulo,
  );

  this.aplicarEstiloExcel(
    hojaMovimientos,
    'A2:I2',
    estiloEmpresa,
  );

  this.aplicarEstiloExcel(
    hojaMovimientos,
    'A3:I3',
    {
      font: {
        name: 'Calibri',
        sz: 10,
        italic: true,
        color: { rgb: '64748B' },
      },
      alignment: {
        vertical: 'center',
      },
    },
  );

  this.aplicarEstiloExcel(
    hojaMovimientos,
    'A5:I5',
    {
      fill: {
        patternType: 'solid',
        fgColor: { rgb: '2F75B5' },
      },
      font: {
        name: 'Calibri',
        sz: 10,
        bold: true,
        color: { rgb: 'FFFFFF' },
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
      },
      border: bordeSuave,
    },
  );

  const ultimaFila =
    movimientos.length + 5;

  for (
    let fila = 6;
    fila <= ultimaFila;
    fila++
  ) {
    const colorFondo =
      fila % 2 === 0
        ? 'F8FAFC'
        : 'FFFFFF';

    this.aplicarEstiloExcel(
      hojaMovimientos,
      `A${fila}:I${fila}`,
      {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: colorFondo },
        },
        font: {
          name: 'Calibri',
          sz: 10,
          color: { rgb: '334155' },
        },
        alignment: {
          vertical: 'center',
          wrapText: false,
        },
        border: {
          bottom: {
            style: 'thin',
            color: { rgb: 'E2E8F0' },
          },
        },
      },
    );

    const celdaFecha =
      hojaMovimientos[`A${fila}`];

    const celdaMonto =
      hojaMovimientos[`G${fila}`];

    const celdaEstado =
      hojaMovimientos[`E${fila}`];

    if (celdaFecha) {
      celdaFecha.s = {
        ...celdaFecha.s,
        numFmt: 'dd/mm/yyyy',
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
      };
    }

    if (celdaMonto) {
      const movimiento =
        reporte.movimientos[
          fila - 6
        ];

      celdaMonto.s = {
        ...celdaMonto.s,
        numFmt: formatoMonto,
        font: {
          name: 'Calibri',
          sz: 10,
          bold: true,
          color: {
            rgb:
              movimiento.tipoMovimiento === 1
                ? '15803D'
                : 'DC2626',
          },
        },
        alignment: {
          horizontal: 'right',
          vertical: 'center',
        },
      };
    }

    if (celdaEstado) {
      const estado =
        String(celdaEstado.v)
          .toLowerCase();

      const colorEstado =
        estado === 'pagado'
          ? 'DCFCE7'
          : estado === 'proyectado'
            ? 'FEF3C7'
            : 'DBEAFE';

      celdaEstado.s = {
        ...celdaEstado.s,

        fill: {
          patternType: 'solid',
          fgColor: {
            rgb: colorEstado,
          },
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        font: {
          name: 'Calibri',
          sz: 9,
          bold: true,
          color: { rgb: '334155' },
        },
      };
    }
  }

  hojaMovimientos['!autofilter'] = {
    ref: `A5:I${Math.max(
      ultimaFila,
      5,
    )}`,
  };

  /*
   * CREAR ARCHIVO
   */

  const libro =
    XLSX.utils.book_new();

  libro.Props = {
    Title: 'Reporte de movimientos',
    Subject: `Periodo ${periodo}`,
    Author: razonSocial,
    Company: razonSocial,
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(
    libro,
    hojaResumen,
    'Resumen',
  );

  XLSX.utils.book_append_sheet(
    libro,
    hojaMovimientos,
    'Movimientos',
  );

  const nombreEmpresa =
    this.limpiarNombreArchivo(
      empresa.nombreComercial
      || razonSocial,
    );

  XLSX.writeFile(
    libro,
    `reporte-${nombreEmpresa}-${this.obtenerFechaArchivo()}.xlsx`,
  );
}

private convertirFechaExcel(
  fecha: string,
): Date {
  const [
    anio,
    mes,
    dia,
  ] = fecha
    .split('-')
    .map(Number);

  return new Date(
    anio,
    mes - 1,
    dia,
    12,
    0,
    0,
  );
}

private limpiarNombreArchivo(
  texto: string,
): string {
  return texto
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      '-',
    )
    .replace(
      /^-+|-+$/g,
      '',
    )
    .toLowerCase();
}

obtenerFechaHoraActual(): string {
  return new Intl.DateTimeFormat(
    'es-PE',
    {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone:
        this.empresaActual.zonaHoraria
        || 'America/Lima',
    },
  ).format(
    new Date(),
  );
}

obtenerPeriodoActual(): string {
  const datos =
    this.formulario.getRawValue();

  return `${this.formatearFecha(datos.fechaDesde)} al `
    + `${this.formatearFecha(datos.fechaHasta)}`;
}

exportarPdf(reporte: ResultadoReporteMovimientos): void {
  const empresa = this.sesionEmpresaService.empresaActual;
  const filtros = this.formulario.getRawValue();

  const documento = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });

  const anchoPagina = documento.internal.pageSize.getWidth();
  const altoPagina = documento.internal.pageSize.getHeight();
  const margen = 12;

  const nombreEmpresa =
    empresa.razonSocial?.trim() ||
    empresa.nombreComercial?.trim() ||
    'Empresa';

  const periodo =
    `${this.formatearFecha(filtros.fechaDesde)} al ` +
    `${this.formatearFecha(filtros.fechaHasta)}`;

  const fechaGeneracion = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: empresa.zonaHoraria || 'America/Lima',
  }).format(new Date());

  const ingresos = Number(reporte.resumen.totalIngresos) || 0;

  const egresosPagados =
    Number(reporte.resumen.totalEgresosPagados) || 0;

  const egresosProyectados =
    Number(reporte.resumen.totalEgresosProyectados) || 0;

  const netoReal = ingresos - egresosPagados;

  const netoProyectado =
    netoReal - egresosProyectados;

  const iniciales = (
    empresa.nombreComercial ||
    empresa.razonSocial ||
    'FC'
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');

  const dibujarCabeceraPrincipal = (): void => {
    documento.setFillColor(23, 54, 93);
    documento.roundedRect(margen, 10, 18, 18, 3, 3, 'F');

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(10);
    documento.setTextColor(255, 255, 255);
    documento.text(iniciales, margen + 9, 21, {
      align: 'center',
    });

    documento.setTextColor(30, 41, 59);
    documento.setFontSize(14);
    documento.text(nombreEmpresa, 36, 15);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(8);
    documento.setTextColor(100, 116, 139);
    documento.text(
      `RUC: ${empresa.ruc || 'No registrado'}`,
      36,
      21,
    );

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(11);
    documento.setTextColor(37, 99, 235);
    documento.text('REPORTE DE MOVIMIENTOS', 36, 27);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(8);
    documento.setTextColor(100, 116, 139);
    documento.text('Periodo consultado', anchoPagina - margen, 14, {
      align: 'right',
    });

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(10);
    documento.setTextColor(30, 41, 59);
    documento.text(periodo, anchoPagina - margen, 20, {
      align: 'right',
    });

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.setTextColor(100, 116, 139);
    documento.text(
      `Generado: ${fechaGeneracion}`,
      anchoPagina - margen,
      26,
      { align: 'right' },
    );

    documento.setDrawColor(37, 99, 235);
    documento.setLineWidth(0.7);
    documento.line(margen, 32, anchoPagina - margen, 32);
  };

  const dibujarCabeceraContinuacion = (): void => {
    documento.setFont('helvetica', 'bold');
    documento.setFontSize(9);
    documento.setTextColor(30, 41, 59);
    documento.text(nombreEmpresa, margen, 13);

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.setTextColor(100, 116, 139);
    documento.text(
      `Reporte de movimientos | ${periodo}`,
      margen,
      18,
    );

    documento.setDrawColor(203, 213, 225);
    documento.setLineWidth(0.3);
    documento.line(margen, 22, anchoPagina - margen, 22);
  };

  const dibujarIndicador = (
    x: number,
    titulo: string,
    valor: number,
    color: [number, number, number],
  ): void => {
    const anchoIndicador = 51;

    documento.setFillColor(248, 250, 252);
    documento.setDrawColor(226, 232, 240);
    documento.setLineWidth(0.25);

    documento.roundedRect(
      x,
      37,
      anchoIndicador,
      17,
      2,
      2,
      'FD',
    );

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.setTextColor(100, 116, 139);
    documento.text(titulo, x + 4, 43);

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(10);
    documento.setTextColor(...color);
    documento.text(
      this.formatearMontoPdf(valor),
      x + 4,
      50,
    );
  };

  dibujarCabeceraPrincipal();

  dibujarIndicador(
    margen,
    'Ingresos',
    ingresos,
    [22, 163, 74],
  );

  dibujarIndicador(
    margen + 55,
    'Egresos pagados',
    egresosPagados,
    [220, 38, 38],
  );

  dibujarIndicador(
    margen + 110,
    'Egresos proyectados',
    egresosProyectados,
    [217, 119, 6],
  );

  dibujarIndicador(
    margen + 165,
    'Neto real',
    netoReal,
    netoReal >= 0
      ? [22, 163, 74]
      : [220, 38, 38],
  );

  dibujarIndicador(
    margen + 220,
    'Neto proyectado',
    netoProyectado,
    netoProyectado >= 0
      ? [22, 163, 74]
      : [220, 38, 38],
  );

  const tipoFiltro =
    filtros.tipoMovimiento === 1
      ? 'Ingresos'
      : filtros.tipoMovimiento === 2
        ? 'Egresos'
        : 'Todos';

  const estadoFiltro =
    filtros.tipoMovimiento !== 2
      ? 'No aplica'
      : filtros.estadoEgreso === 'pagado'
        ? 'Pagados'
        : filtros.estadoEgreso === 'proyectado'
          ? 'Proyectados'
          : 'Todos';

  const clasificadorFiltro =
    filtros.categoriaId > 0
      ? reporte.movimientos.find(
          (movimiento) =>
            movimiento.categoriaId === filtros.categoriaId,
        )?.categoria ?? `ID ${filtros.categoriaId}`
      : 'Todos';

  documento.setFont('helvetica', 'normal');
  documento.setFontSize(7);
  documento.setTextColor(100, 116, 139);

  documento.text(
    `Filtros: ${tipoFiltro} | Clasificador: ${clasificadorFiltro} | Estado: ${estadoFiltro}`,
    margen,
    61,
  );

  documento.setFont('helvetica', 'bold');
  documento.setFontSize(10);
  documento.setTextColor(30, 41, 59);
  documento.text('Detalle de movimientos', margen, 68);

  documento.setFont('helvetica', 'normal');
  documento.setFontSize(7);
  documento.setTextColor(100, 116, 139);
  documento.text(
    `${reporte.resumen.cantidadRegistros} movimientos encontrados`,
    anchoPagina - margen,
    68,
    { align: 'right' },
  );

  autoTable(documento, {
    startY: 72,

    margin: {
      top: 27,
      right: margen,
      bottom: 15,
      left: margen,
    },

    head: [[
      'Fecha',
      'Tipo',
      'Clasificador',
      'Descripción',
      'Estado',
      'Medio de pago',
      'Monto',
    ]],

    body:
      reporte.movimientos.length > 0
        ? reporte.movimientos.map((movimiento) => [
            this.formatearFecha(movimiento.fechaMovimiento),
            movimiento.tipoMovimientoDescripcion,
            movimiento.categoria,
            movimiento.descripcion,
            movimiento.estado,
            movimiento.medioPagoDescripcion ||
              'No especificado',
            `${movimiento.tipoMovimiento === 1 ? '+' : '-'} ${this.formatearMontoPdf(movimiento.monto)}`,
          ])
        : [[
            {
              content:
                'No se encontraron movimientos para los filtros seleccionados.',
              colSpan: 7,
              styles: {
                halign: 'center',
                textColor: [100, 116, 139],
              },
            },
          ]],

    theme: 'plain',

    styles: {
      font: 'helvetica',
      fontSize: 7.4,
      textColor: [71, 85, 105],
      cellPadding: {
        top: 3,
        right: 2.5,
        bottom: 3,
        left: 2.5,
      },
      lineColor: [226, 232, 240],
      lineWidth: {
        bottom: 0.2,
      },
      overflow: 'linebreak',
      valign: 'middle',
    },

    headStyles: {
      fillColor: [23, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: 0,
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },

    columnStyles: {
      0: { cellWidth: 23 },
      1: { cellWidth: 23 },
      2: { cellWidth: 38 },
      3: { cellWidth: 78 },
      4: { cellWidth: 28 },
      5: { cellWidth: 40 },
      6: {
        cellWidth: 34,
        halign: 'right',
        fontStyle: 'bold',
      },
    },

    showHead: 'everyPage',
    rowPageBreak: 'avoid',

    willDrawPage: (datos) => {
      if (datos.pageNumber > 1) {
        dibujarCabeceraContinuacion();
      }
    },

    didParseCell: (datos) => {
      if (datos.section !== 'body') {
        return;
      }

      const movimiento =
        reporte.movimientos[datos.row.index];

      if (!movimiento) {
        return;
      }

      if (datos.column.index === 1) {
        datos.cell.styles.fontStyle = 'bold';

        datos.cell.styles.textColor =
          movimiento.tipoMovimiento === 1
            ? [22, 163, 74]
            : [220, 38, 38];
      }

      if (datos.column.index === 4) {
        datos.cell.styles.fontStyle = 'bold';

        if (movimiento.estado === 'Proyectado') {
          datos.cell.styles.textColor = [217, 119, 6];
          datos.cell.styles.fillColor = [255, 251, 235];
        } else if (!movimiento.activo) {
          datos.cell.styles.textColor = [100, 116, 139];
          datos.cell.styles.fillColor = [241, 245, 249];
        } else {
          datos.cell.styles.textColor = [22, 101, 52];
          datos.cell.styles.fillColor = [240, 253, 244];
        }
      }

      if (datos.column.index === 6) {
        datos.cell.styles.textColor =
          movimiento.tipoMovimiento === 1
            ? [22, 163, 74]
            : [220, 38, 38];
      }
    },
  });

const cantidadPaginas = documento.getNumberOfPages();

  for (
    let numeroPagina = 1;
    numeroPagina <= cantidadPaginas;
    numeroPagina++
  ) {
    documento.setPage(numeroPagina);

    documento.setDrawColor(226, 232, 240);
    documento.setLineWidth(0.2);

    documento.line(
      margen,
      altoPagina - 11,
      anchoPagina - margen,
      altoPagina - 11,
    );

    documento.setFont('helvetica', 'normal');
    documento.setFontSize(7);
    documento.setTextColor(100, 116, 139);

    documento.text(
      'Flujo Claro | Gestión financiera',
      margen,
      altoPagina - 6,
    );

    documento.text(
      `Página ${numeroPagina} de ${cantidadPaginas}`,
      anchoPagina - margen,
      altoPagina - 6,
      { align: 'right' },
    );
  }

  documento.setProperties({
    title: `Reporte de movimientos - ${nombreEmpresa}`,
    subject: `Movimientos del ${periodo}`,
    author: nombreEmpresa,
    creator: 'Flujo Claro',
  });

  documento.save(
    `reporte-${this.limpiarNombreArchivo(
      empresa.nombreComercial || nombreEmpresa,
    )}-${this.obtenerFechaArchivo()}.pdf`,
  );
}

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');

    if (!anio || !mes || !dia) {
      return fecha;
    }

    return `${dia}/${mes}/${anio}`;
  }

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

  private obtenerFechaArchivo(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private construirFiltro():
  FiltroReporteMovimientos | null {

  const datos =
    this.formulario.getRawValue();

  if (
    !datos.fechaDesde
    || !datos.fechaHasta
    || datos.fechaDesde > datos.fechaHasta
  ) {
    return null;
  }

  return {
    fechaDesde: datos.fechaDesde,
    fechaHasta: datos.fechaHasta,

    tipoMovimiento:
      datos.tipoMovimiento > 0
        ? datos.tipoMovimiento
        : undefined,

    categoriaId:
      datos.categoriaId > 0
        ? datos.categoriaId
        : undefined,

    cancelado:
      datos.tipoMovimiento === 2
      && datos.estadoEgreso !== 'todos'
        ? datos.estadoEgreso === 'pagado'
        : undefined,

        incluirAnulados:
  datos.incluirAnulados,
  };
}

private aplicarEstiloExcel(
  hoja: XLSX.WorkSheet,
  rango: string,
  estilo: Record<string, unknown>,
): void {
  const limites =
    XLSX.utils.decode_range(
      rango,
    );

  for (
    let fila = limites.s.r;
    fila <= limites.e.r;
    fila++
  ) {
    for (
      let columna = limites.s.c;
      columna <= limites.e.c;
      columna++
    ) {
      const referencia =
        XLSX.utils.encode_cell({
          r: fila,
          c: columna,
        });

      if (!hoja[referencia]) {
        hoja[referencia] = {
          t: 's',
          v: '',
        };
      }

      hoja[referencia].s =
        estilo;
    }
  }
}
private formatearMontoPdf(valor: number): string {
  return `S/ ${new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0)}`;
}
calcularNetoReal(
  reporte: ResultadoReporteMovimientos,
): number {
  return (
    Number(reporte.resumen.totalIngresos || 0) -
    Number(reporte.resumen.totalEgresosPagados || 0)
  );
}

calcularNetoProyectado(
  reporte: ResultadoReporteMovimientos,
): number {
  return (
    Number(reporte.resumen.totalIngresos || 0) -
    Number(reporte.resumen.totalEgresosPagados || 0) -
    Number(reporte.resumen.totalEgresosProyectados || 0)
  );
}

}
