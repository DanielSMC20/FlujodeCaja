import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  switchMap,
  take,
} from 'rxjs';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

import { FlujoCajaService } from '../../../../nucleo/servicios/flujo-caja.service';
import { ConfiguracionFinancieraService } from '../../../../nucleo/servicios/configuracion-financiera.service';

import { ChartNoAxesCombined, LucideAngularModule } from 'lucide-angular';

interface FiltroFlujoCaja {
  fechaDesde?: string;

  fechaHasta?: string;
}

@Component({
  selector: 'app-flujo-caja',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './flujo-caja.component.html',

  styleUrl: './flujo-caja.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlujoCajaComponent {
  readonly ChartNoAxesCombined = ChartNoAxesCombined;

  private readonly flujoCajaService = inject(FlujoCajaService);

  private readonly configuracionService = inject(ConfiguracionFinancieraService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly destroyRef = inject(DestroyRef);

  private readonly formBuilder = inject(FormBuilder);

  private readonly fechasIniciales = this.obtenerFechasIniciales();

  fechaApertura = '';

  errorFiltro = '';
  cargandoFlujo = false;

  readonly formulario = this.formBuilder.nonNullable.group({
    fechaDesde: [this.fechasIniciales.fechaDesde],

    fechaHasta: [this.fechasIniciales.fechaHasta],
  });

  private readonly filtroSubject = new BehaviorSubject<FiltroFlujoCaja>({
    fechaDesde: this.fechasIniciales.fechaDesde,

    fechaHasta: this.fechasIniciales.fechaHasta,
  });

readonly flujoCaja$ =
  this.filtroSubject.pipe(
    switchMap((filtro) => {
      this.cargandoFlujo = true;

      this.changeDetectorRef.markForCheck();

      return this.flujoCajaService
        .obtenerFlujoCaja(
          filtro.fechaDesde,
          filtro.fechaHasta,
        )
        .pipe(
          catchError((error) => {
            void import('sweetalert2').then(
              ({ default: Swal }) =>
                Swal.fire({
                  icon: 'error',
                  title:
                    'No se pudo cargar el flujo de caja',
                  text:
                    error instanceof Error
                      ? error.message
                      : 'Ocurrió un error al consultar el flujo de caja.',
                  confirmButtonText: 'Aceptar',
                  heightAuto: false,
                }),
            );

            return EMPTY;
          }),

          finalize(() => {
            this.cargandoFlujo = false;

            this.changeDetectorRef.markForCheck();
          }),
        );
    }),
  );

  constructor() {
    this.configuracionService
      .obtenerConfiguracion()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuracion) => {
          this.fechaApertura = configuracion?.fechaSaldoInicial ?? '';

          if (
            this.fechaApertura &&
            this.formulario.controls.fechaDesde.value < this.fechaApertura
          ) {
            this.formulario.controls.fechaDesde.setValue(this.fechaApertura);
            this.aplicarFiltros();
          }

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();

    this.errorFiltro = '';

    if (
      datos.fechaDesde &&
      datos.fechaHasta &&
      datos.fechaDesde > datos.fechaHasta
    ) {
      this.errorFiltro = 'La fecha inicial no puede ser mayor a la fecha final.';
      return;
    }

    if (
      this.fechaApertura &&
      datos.fechaDesde &&
      datos.fechaDesde < this.fechaApertura
    ) {
      this.errorFiltro =
        'El periodo no puede comenzar antes de la fecha de apertura.';
      return;
    }

    this.filtroSubject.next({
      fechaDesde: datos.fechaDesde || undefined,

      fechaHasta: datos.fechaHasta || undefined,
    });
  }

  limpiarFiltros(): void {
    this.formulario.setValue({
      fechaDesde: '',

      fechaHasta: '',
    });

    this.filtroSubject.next({});
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
}
