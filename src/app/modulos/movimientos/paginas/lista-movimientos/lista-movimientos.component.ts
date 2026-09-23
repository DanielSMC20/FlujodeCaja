import { AsyncPipe, CommonModule } from '@angular/common';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,ChangeDetectorRef,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  map,
  startWith,
  switchMap,
  catchError,
finalize,
EMPTY,
} from 'rxjs';

import {
  Ban,
  EllipsisVertical,
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
    mas: EllipsisVertical,
    anular: Ban,
    vacio: SearchX,
  };

  private readonly movimientoService = inject(MovimientoService);

  readonly constanteService = inject(ConstanteService);
  readonly mediosPago$ =
  this.constanteService.obtenerConstante(200);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef =   inject(ChangeDetectorRef);

cargandoMovimientos = false;

  private readonly formBuilder = inject(FormBuilder);

  tipoSeleccionado: number | null = null;

  private readonly tipoSeleccionadoSubject = new BehaviorSubject<number | null>(
    null,
  );

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

  readonly filtroForm = this.formBuilder.nonNullable.group({
    fechaDesde: [''],

    fechaHasta: [''],

    busqueda: [''],

    medioPago: [0],
  });

  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  get puedeGestionarMovimientos(): boolean {
    return this.sesionUsuarioService.puedeGestionarMovimientos;
  }
  get puedeAnularMovimientos(): boolean {
    return this.sesionUsuarioService.puedeAnularMovimientos;
  }

  puedeEditarMovimiento(movimiento: Movimiento): boolean {
    if (!this.puedeGestionarMovimientos) {
      return false;
    }

    return (
      movimiento.activo !== false &&
      (movimiento.tipoMovimiento === 1 || movimiento.bCancelado === 0)
    );
  }

  puedeAnularMovimiento(movimiento: Movimiento): boolean {
    return this.puedeAnularMovimientos && movimiento.activo !== false;
  }
  menuAccionesAbiertoId: number | null = null;

  alternarMenuAcciones(movimientoId: number): void {
    this.menuAccionesAbiertoId =
      this.menuAccionesAbiertoId === movimientoId ? null : movimientoId;
  }

  cerrarMenuAcciones(): void {
    this.menuAccionesAbiertoId = null;
  }
  async anularMovimiento(movimiento: Movimiento): Promise<void> {
    this.cerrarMenuAcciones();

    if (!this.puedeAnularMovimiento(movimiento)) {
      return;
    }

    const { default: Swal } = await import('sweetalert2');

    const resultado = await Swal.fire<string>({
      icon: 'warning',

      title: 'Anular movimiento',

      text: 'El movimiento dejará de afectar el flujo de caja, pero se conservará para auditoría.',

      input: 'textarea',

      inputLabel: 'Motivo de anulación',

      inputPlaceholder: 'Ej. Registro duplicado',

      inputAttributes: {
        maxlength: '300',
      },

      showCancelButton: true,

      confirmButtonText: 'Sí, anular',

      cancelButtonText: 'Cancelar',

      confirmButtonColor: '#dc2626',

      reverseButtons: true,

      heightAuto: false,

      inputValidator: (valor) => {
        const motivo = valor?.trim() ?? '';

        if (!motivo) {
          return 'Ingresa el motivo de la anulación.';
        }

        if (motivo.length > 300) {
          return 'El motivo no puede superar los 300 caracteres.';
        }

        return null;
      },
    });

    const motivo = resultado.value?.trim();

    if (!resultado.isConfirmed || !motivo) {
      return;
    }

    this.movimientoService
      .anularMovimiento(movimiento.id, {
        motivo,
      })
      .subscribe({
        next: async () => {
          this.recargarMovimientosSubject.next();

          await Swal.fire({
            icon: 'success',

            title: 'Movimiento anulado',

            text: 'El movimiento fue anulado correctamente.',

            confirmButtonText: 'Aceptar',

            heightAuto: false,
          });
        },

        error: async (error) => {
          await Swal.fire({
            icon: 'error',

            title: 'No se pudo anular el movimiento',

            text:
              error instanceof Error
                ? error.message
                : 'Ocurrió un error al procesar la anulación.',

            confirmButtonText: 'Entendido',

            heightAuto: false,
          });
        },
      });
  }

  /* ======================================================
     MOVIMIENTOS
     ====================================================== */

  private readonly recargarMovimientosSubject = new BehaviorSubject<void>(
    undefined,
  );

  private readonly movimientosBase$ =
  this.recargarMovimientosSubject.pipe(
    switchMap(() => {
      this.cargandoMovimientos = true;

      this.changeDetectorRef.markForCheck();

      return this.movimientoService
        .listarMovimientos()
        .pipe(
          catchError((error) => {
            void import('sweetalert2').then(
              ({ default: Swal }) =>
                Swal.fire({
                  icon: 'error',
                  title:
                    'No se pudieron cargar los movimientos',
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
            this.cargandoMovimientos = false;

            this.changeDetectorRef.markForCheck();
          }),
        );
    }),
  );

  readonly movimientos$ = combineLatest([
    this.movimientosBase$,

    this.tipoSeleccionadoSubject,

    this.filtroForm.valueChanges.pipe(
      startWith(this.filtroForm.getRawValue()),
      debounceTime(120),
    ),
  ]).pipe(
    map(([movimientos, tipoSeleccionado, filtros]) => {
      const busqueda = (filtros.busqueda ?? '').trim().toLowerCase();

      return movimientos.filter((movimiento) => {
        /* Tipo */

        if (
          tipoSeleccionado !== null &&
          movimiento.tipoMovimiento !== tipoSeleccionado
        ) {
          return false;
        }

        /* Fecha desde */

        if (
          filtros.fechaDesde &&
          movimiento.fechaMovimiento < filtros.fechaDesde
        ) {
          return false;
        }

        /* Fecha hasta */

        if (
          filtros.fechaHasta &&
          movimiento.fechaMovimiento > filtros.fechaHasta
        ) {
          return false;
        }

        /* Medio de pago */

        if (
          filtros.medioPago !== 0 &&
          movimiento.medioPago !== filtros.medioPago
        ) {
          return false;
        }

        /* Búsqueda */

        if (busqueda) {
          const textoMovimiento = `
                    ${movimiento.descripcion}
                    ${movimiento.categoria}
                  `.toLowerCase();

          if (!textoMovimiento.includes(busqueda)) {
            return false;
          }
        }

        return true;
      });
    }),
  );

  constructor() {
    /*
      Permite abrir directamente:

      /movimientos?tipo=1
      /movimientos?tipo=2
    */

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const tipo = params.get('tipo');

        if (tipo === '1' || tipo === '2') {
          this.tipoSeleccionado = Number(tipo);
        } else {
          this.tipoSeleccionado = null;
        }

        this.tipoSeleccionadoSubject.next(this.tipoSeleccionado);
      });
  }

  /* ======================================================
     TIPO
     ====================================================== */

  seleccionarTipo(tipo: number | null): void {
    void this.router.navigate(['/movimientos'], {
      queryParams: tipo === null ? {} : { tipo },
    });
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

  etiquetaMovimiento(tipoMovimiento: number): string {
    return this.constanteService.obtenerDescripcion(100, tipoMovimiento);
  }

  etiquetaMedioPago(medioPago: number): string {
    return this.constanteService.obtenerDescripcion(200, medioPago);
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

  formatearFecha(fecha: string): string {
    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const [anio, mes, dia] = partes;

    return `${dia}/${mes}/${anio}`;
  }
}
