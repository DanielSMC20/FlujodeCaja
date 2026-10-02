import {
  AsyncPipe,
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  switchMap,
} from 'rxjs';

import {
  FileSpreadsheet,
  LucideAngularModule,
  ReceiptText,
  RotateCcw,
  Search,
} from 'lucide-angular';

import * as XLSX
  from 'xlsx-js-style';


import {
  FiltroMovimientos,
  Movimiento,
} from '../../../../nucleo/modelos/movimiento';

import {
  MovimientoService,
} from '../../../../nucleo/servicios/movimiento.service';

import {
  SesionEmpresaService,
} from '../../../../nucleo/servicios/sesion-empresa.service';

import {
  MonedaSolPipe,
} from '../../../../compartido/pipes/moneda-sol.pipe';


type EstadoCompra =
  | 'todos'
  | 'pagado'
  | 'proyectado';


@Component({

  selector:
    'app-registro-compras',

  standalone:
    true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    LucideAngularModule,
    MonedaSolPipe,
  ],

  templateUrl:
    './registro-compras.component.html',

  styleUrl:
    './registro-compras.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,

})
export class RegistroComprasComponent {

  private readonly formBuilder =
    inject(
      FormBuilder,
    );

  private readonly movimientoService =
    inject(
      MovimientoService,
    );

  private readonly sesionEmpresaService =
    inject(
      SesionEmpresaService,
    );

  private readonly changeDetectorRef =
    inject(
      ChangeDetectorRef,
    );


  readonly iconos = {

    compras:
      ReceiptText,

    excel:
      FileSpreadsheet,

    buscar:
      Search,

    limpiar:
      RotateCcw,

  };


  cargando =
    false;


  errorFiltro =
    '';


  private readonly fechasIniciales =
    this.obtenerFechasIniciales();


  readonly formulario =
    this.formBuilder
      .nonNullable
      .group({

        fechaDesde: [
          this.fechasIniciales
            .fechaDesde,
        ],

        fechaHasta: [
          this.fechasIniciales
            .fechaHasta,
        ],

        estado: [
          'todos' as EstadoCompra,
        ],

      });


  private readonly filtroSubject =
    new BehaviorSubject<FiltroMovimientos>(
      this.construirFiltro(),
    );


  readonly compras$ =
    this.filtroSubject
      .pipe(

        switchMap(
          (filtro) => {

            this.cargando =
              true;

            this.changeDetectorRef
              .markForCheck();


            return this
              .movimientoService
              .listarMovimientosFiltrados(
                filtro,
              )
              .pipe(

                catchError(
                  (error) => {

                    void import(
                      'sweetalert2'
                    )
                      .then(
                        ({
                          default:
                            Swal,
                        }) =>
                          Swal.fire({

                            icon:
                              'error',

                            title:
                              'No se pudo cargar el registro de compras',

                            text:
                              error instanceof Error
                                ? error.message
                                : 'Ocurrió un error al consultar los egresos.',

                            confirmButtonText:
                              'Aceptar',

                            heightAuto:
                              false,

                          }),
                      );


                    return EMPTY;

                  },
                ),


                finalize(
                  () => {

                    this.cargando =
                      false;

                    this
                      .changeDetectorRef
                      .markForCheck();

                  },
                ),

              );

          },
        ),

      );


  aplicarFiltros(): void {

    const datos =
      this.formulario
        .getRawValue();


    if (
      !datos.fechaDesde
      ||
      !datos.fechaHasta
    ) {

      this.errorFiltro =
        'Selecciona la fecha inicial y la fecha final.';

      return;

    }


    if (
      datos.fechaDesde
      >
      datos.fechaHasta
    ) {

      this.errorFiltro =
        'La fecha inicial no puede ser mayor que la fecha final.';

      return;

    }


    this.errorFiltro =
      '';


    this.filtroSubject
      .next(
        this.construirFiltro(),
      );

  }


  limpiarFiltros(): void {

    const fechas =
      this.obtenerFechasIniciales();


    this.formulario
      .setValue({

        fechaDesde:
          fechas.fechaDesde,

        fechaHasta:
          fechas.fechaHasta,

        estado:
          'todos',

      });


    this.errorFiltro =
      '';


    this.filtroSubject
      .next(
        this.construirFiltro(),
      );

  }


  obtenerProveedor(
    movimiento:
      Movimiento,
  ): string {

    return (
      movimiento
        .razonSocialEmisor
        ?.trim()
      ||
      '—'
    );

  }


  obtenerRuc(
    movimiento:
      Movimiento,
  ): string {

    return (
      movimiento
        .documentoEmisor
        ?.trim()
      ||
      '—'
    );

  }


  obtenerComprobante(
    movimiento:
      Movimiento,
  ): string {

    const serie =
      movimiento
        .serieComprobante
        ?.trim();


    const numero =
      movimiento
        .numeroComprobante
        ?.trim();


    if (
      serie
      &&
      numero
    ) {

      return (
        `${serie}-${numero}`
      );

    }


    return (
      numero
      ||
      serie
      ||
      '—'
    );

  }


  obtenerConcepto(
    movimiento:
      Movimiento,
  ): string {

    return (
      movimiento
        .descripcion
        ?.trim()
      ||
      movimiento.categoria
      ||
      '—'
    );

  }


  obtenerEstado(
    movimiento:
      Movimiento,
  ): string {

    return (
      movimiento.cancelado
      === true
      ||
      movimiento.bCancelado
      === 1
    )
      ? 'Pagado'
      : 'Proyectado';

  }


  claseEstado(
    movimiento:
      Movimiento,
  ): string {

    return (
      this.obtenerEstado(
        movimiento,
      )
      ===
      'Pagado'
    )
      ? 'estado-pagado'
      : 'estado-proyectado';

  }


  obtenerOrigen(
    movimiento:
      Movimiento,
  ): string {

    return (

      movimiento
        .origenRegistroDescripcion
        ?.trim()

      ||

      (
        movimiento
          .origenRegistro
        === 3

          ? 'Importación desde Excel'

          : movimiento
                .origenRegistro
            === 2

            ? 'Registro asistido por XML'

            : 'Registro manual'
      )

    );

  }


  totalCompras(
    compras:
      Movimiento[],
  ): number {

    return compras
      .reduce(
        (
          total,
          movimiento,
        ) =>
          total
          +
          movimiento.monto,

        0,
      );

  }


  totalPagado(
    compras:
      Movimiento[],
  ): number {

    return compras

      .filter(
        (movimiento) =>
          movimiento.cancelado
            === true
          ||
          movimiento.bCancelado
            === 1,
      )

      .reduce(
        (
          total,
          movimiento,
        ) =>
          total
          +
          movimiento.monto,

        0,
      );

  }


  totalProyectado(
    compras:
      Movimiento[],
  ): number {

    return compras

      .filter(
        (movimiento) =>
          movimiento.cancelado
            === false
          ||
          movimiento.bCancelado
            === 0,
      )

      .reduce(
        (
          total,
          movimiento,
        ) =>
          total
          +
          movimiento.monto,

        0,
      );

  }


  formatearFecha(
    fecha?:
      string
      | null,
  ): string {

    if (!fecha) {

      return '—';

    }


    const partes =
      fecha
        .substring(
          0,
          10,
        )
        .split(
          '-',
        );


    if (
      partes.length
      !== 3
    ) {

      return fecha;

    }


    return (
      `${partes[2]}/`
      +
      `${partes[1]}/`
      +
      `${partes[0]}`
    );

  }


  /* =========================================================
     EXPORTAR A EXCEL
     ========================================================= */

  exportarExcel(
    compras:
      Movimiento[],
  ): void {

    if (
      !compras.length
    ) {

      return;

    }


    const empresa =
      this
        .sesionEmpresaService
        .empresaActual;


    const filtros =
      this.formulario
        .getRawValue();


    const razonSocial =
      empresa
        .razonSocial
        ?.trim()

      ||

      empresa
        .nombreComercial
        ?.trim()

      ||

      'Empresa';


    const filas:
      unknown[][] =
      [

        [
          'REGISTRO DE COMPRAS',
        ],

        [
          razonSocial,
        ],

        [
          `Periodo: ${
            this.formatearFecha(
              filtros.fechaDesde,
            )
          } al ${
            this.formatearFecha(
              filtros.fechaHasta,
            )
          }`,
        ],

        [],


        [
          'Fecha',
          'Proveedor',
          'RUC / Documento',
          'Comprobante',
          'Concepto',
          'Importe (S/)',
          'Estado',
          'Origen',
        ],


        ...compras.map(
          (movimiento) => [

            this.formatearFecha(
              movimiento
                .fechaMovimiento,
            ),

            this.obtenerProveedor(
              movimiento,
            ),

            this.obtenerRuc(
              movimiento,
            ),

            this.obtenerComprobante(
              movimiento,
            ),

            this.obtenerConcepto(
              movimiento,
            ),

            movimiento.monto,

            this.obtenerEstado(
              movimiento,
            ),

            this.obtenerOrigen(
              movimiento,
            ),

          ],
        ),


        [],


        [
          '',
          '',
          '',
          '',
          'TOTAL',
          this.totalCompras(
            compras,
          ),
          '',
          '',
        ],

      ];


    const hoja =
      XLSX.utils
        .aoa_to_sheet(
          filas,
        );


    hoja['!merges'] = [

      XLSX.utils
        .decode_range(
          'A1:H1',
        ),

      XLSX.utils
        .decode_range(
          'A2:H2',
        ),

      XLSX.utils
        .decode_range(
          'A3:H3',
        ),

    ];


    hoja['!cols'] = [

      { wch: 14 },

      { wch: 34 },

      { wch: 18 },

      { wch: 22 },

      { wch: 38 },

      { wch: 16 },

      { wch: 15 },

      { wch: 26 },

    ];


    const ultimaFilaDetalle =
      5
      +
      compras.length;


    const filaTotal =
      7
      +
      compras.length;


    this.aplicarEstilo(
      hoja,
      'A1:H1',
      {

        fill: {
          patternType:
            'solid',

          fgColor: {
            rgb:
              '17365D',
          },
        },

        font: {

          bold:
            true,

          sz:
            16,

          color: {
            rgb:
              'FFFFFF',
          },

        },

        alignment: {
          vertical:
            'center',
        },

      },
    );


    this.aplicarEstilo(
      hoja,
      'A5:H5',
      {

        fill: {

          patternType:
            'solid',

          fgColor: {
            rgb:
              '2F75B5',
          },

        },

        font: {

          bold:
            true,

          color: {
            rgb:
              'FFFFFF',
          },

        },

        alignment: {

          horizontal:
            'center',

          vertical:
            'center',

        },

      },
    );


    this.aplicarEstilo(
      hoja,
      `E${filaTotal}:F${filaTotal}`,
      {

        fill: {

          patternType:
            'solid',

          fgColor: {
            rgb:
              'E2E8F0',
          },

        },

        font: {
          bold:
            true,
        },

      },
    );


    for (
      let fila = 6;
      fila <=
      ultimaFilaDetalle;
      fila++
    ) {

      const celdaMonto =
        hoja[
          `F${fila}`
        ];


      if (
        celdaMonto
      ) {

        celdaMonto.z =
          '#,##0.00';

      }

    }


    const celdaTotal =
      hoja[
        `F${filaTotal}`
      ];


    if (
      celdaTotal
    ) {

      celdaTotal.z =
        '#,##0.00';

    }


    const libro =
      XLSX.utils
        .book_new();


    XLSX.utils
      .book_append_sheet(

        libro,

        hoja,

        'Registro de compras',

      );


    XLSX.writeFile(

      libro,

      `registro-compras-${
        filtros.fechaDesde
      }-${
        filtros.fechaHasta
      }.xlsx`,

    );

  }


  private construirFiltro():
    FiltroMovimientos {

    const datos =
      this.formulario
        .getRawValue();


    return {

      /*
       * REGISTRO DE COMPRAS
       * solamente trabaja con EGRESOS.
       */
      tipoMovimiento:
        2,


      fechaDesde:
        datos.fechaDesde,


      fechaHasta:
        datos.fechaHasta,


      cancelado:

        datos.estado
          === 'pagado'

          ? true

          : datos.estado
              === 'proyectado'

            ? false

            : undefined,


      /*
       * No mostramos anulados.
       */
      soloActivos:
        true,

    };

  }


  private aplicarEstilo(

    hoja:
      XLSX.WorkSheet,

    rango:
      string,

    estilo:
      Record<
        string,
        unknown
      >,

  ): void {

    const limites =
      XLSX.utils
        .decode_range(
          rango,
        );


    for (
      let fila =
        limites.s.r;

      fila <=
      limites.e.r;

      fila++
    ) {

      for (
        let columna =
          limites.s.c;

        columna <=
        limites.e.c;

        columna++
      ) {

        const referencia =
          XLSX.utils
            .encode_cell({

              r:
                fila,

              c:
                columna,

            });


        if (
          !hoja[
            referencia
          ]
        ) {

          hoja[
            referencia
          ] = {

            t:
              's',

            v:
              '',

          };

        }


        hoja[
          referencia
        ].s =
          estilo;

      }

    }

  }


  private obtenerFechasIniciales(): {

    fechaDesde:
      string;

    fechaHasta:
      string;

  } {

    const hoy =
      new Date();


    const anio =
      hoy.getFullYear();


    const mes =
      String(
        hoy.getMonth()
        +
        1,
      )
        .padStart(
          2,
          '0',
        );


    const dia =
      String(
        hoy.getDate(),
      )
        .padStart(
          2,
          '0',
        );


    return {

      fechaDesde:
        `${anio}-${mes}-01`,

      fechaHasta:
        `${anio}-${mes}-${dia}`,

    };

  }

}