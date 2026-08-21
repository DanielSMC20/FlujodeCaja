import {
  AsyncPipe,
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  map,
  startWith,
} from 'rxjs';
import {
  Eye,
  LucideAngularModule,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Upload,
} from 'lucide-angular';

import { Movimiento } from '../../../../nucleo/modelos/movimiento';

import { ConstanteService } from '../../../../nucleo/servicios/constante.service';
import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';
import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

@Component({
  selector: 'app-lista-movimientos',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './lista-movimientos.component.html',

  styleUrl: './lista-movimientos.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaMovimientosComponent {
  readonly iconos = {
    importar: Upload,
    nuevo: Plus,
    buscar: Search,
    limpiar: RotateCcw,
    ver: Eye,
    editar: Pencil,
    vacio: SearchX,
  };

  private readonly movimientoService =
    inject(MovimientoService);

  readonly constanteService =
    inject(ConstanteService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly formBuilder =
    inject(FormBuilder);

  tipoSeleccionado: number | null = null;

  private readonly tipoSeleccionadoSubject =
    new BehaviorSubject<number | null>(null);

  readonly filtrosTipo = [
    {
      label: 'Todos',
      value: null,
    },
    {
      label: 'Ingresos',
      value: 1,
    },
    {
      label: 'Egresos',
      value: 2,
    },
  ];

  /* ======================================================
     FORMULARIO DE FILTROS
     ====================================================== */

  readonly filtroForm =
    this.formBuilder.nonNullable.group({

      fechaDesde: [''],

      fechaHasta: [''],

      busqueda: [''],

      medioPago: [0],

    });

  /* ======================================================
     MOVIMIENTOS
     ====================================================== */

  private readonly movimientosBase$ =
    this.movimientoService.listarMovimientos();

  readonly movimientos$ =
    combineLatest([

      this.movimientosBase$,

      this.tipoSeleccionadoSubject,

      this.filtroForm.valueChanges.pipe(
        startWith(
          this.filtroForm.getRawValue(),
        ),
        debounceTime(120),
      ),

    ]).pipe(

      map(
        ([
          movimientos,
          tipoSeleccionado,
          filtros,
        ]) => {

          const busqueda =
            (filtros.busqueda ?? '')
              .trim()
              .toLowerCase();

          return movimientos.filter(
            movimiento => {

              /* Tipo */

              if (
                tipoSeleccionado !== null &&
                movimiento.tipoMovimiento !==
                  tipoSeleccionado
              ) {
                return false;
              }

              /* Fecha desde */

              if (
                filtros.fechaDesde &&
                movimiento.fechaMovimiento <
                  filtros.fechaDesde
              ) {
                return false;
              }

              /* Fecha hasta */

              if (
                filtros.fechaHasta &&
                movimiento.fechaMovimiento >
                  filtros.fechaHasta
              ) {
                return false;
              }

              /* Medio de pago */

              if (
                filtros.medioPago !== 0 &&
                movimiento.medioPago !==
                  filtros.medioPago
              ) {
                return false;
              }

              /* Búsqueda */

              if (busqueda) {

                const textoMovimiento =
                  `
                    ${movimiento.descripcion}
                    ${movimiento.categoria}
                  `
                    .toLowerCase();

                if (
                  !textoMovimiento.includes(
                    busqueda,
                  )
                ) {
                  return false;
                }

              }

              return true;
            },
          );

        },
      ),

    );

  constructor() {

    /*
      Permite abrir directamente:

      /movimientos?tipo=1
      /movimientos?tipo=2
    */

    this.route.queryParamMap
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(params => {

        const tipo =
          params.get('tipo');

        if (
          tipo === '1' ||
          tipo === '2'
        ) {

          this.tipoSeleccionado =
            Number(tipo);

        } else {

          this.tipoSeleccionado =
            null;

        }

        this.tipoSeleccionadoSubject.next(
          this.tipoSeleccionado,
        );

      });

  }

  /* ======================================================
     TIPO
     ====================================================== */

  seleccionarTipo(
    tipo: number | null,
  ): void {

    void this.router.navigate(
      ['/movimientos'],
      {
        queryParams:
          tipo === null
            ? {}
            : { tipo },
      },
    );

  }

  /* ======================================================
     LIMPIAR FILTROS
     ====================================================== */

  limpiarFiltros(): void {

    this.filtroForm.reset({
      fechaDesde: '',
      fechaHasta: '',
      busqueda: '',
      medioPago: 0,
    });

  }

  /* ======================================================
     CONSTANTES
     ====================================================== */

  etiquetaMovimiento(
    tipoMovimiento: number,
  ): string {

    return this.constanteService
      .obtenerDescripcion(
        100,
        tipoMovimiento,
      );

  }

  etiquetaMedioPago(
    medioPago: number,
  ): string {

    return this.constanteService
      .obtenerDescripcion(
        200,
        medioPago,
      );

  }

  etiquetaEstado(movimiento: Movimiento): string {
    if (movimiento.tipoMovimiento === 1) {
      return 'Confirmado';
    }

    return movimiento.bCancelado === 0 ? 'Proyectado' : 'Pagado';
  }

  /* ======================================================
     FECHA
     ====================================================== */

  formatearFecha(
    fecha: string,
  ): string {

    const partes =
      fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const [
      anio,
      mes,
      dia,
    ] = partes;

    return `${dia}/${mes}/${anio}`;
  }

}
