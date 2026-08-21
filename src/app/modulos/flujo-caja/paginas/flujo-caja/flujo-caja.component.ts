import { AsyncPipe, CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BehaviorSubject, switchMap } from 'rxjs';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

import { FlujoCajaService } from '../../../../nucleo/servicios/flujo-caja.service';

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

  private readonly formBuilder = inject(FormBuilder);

  private readonly fechasIniciales = this.obtenerFechasIniciales();

  readonly formulario = this.formBuilder.nonNullable.group({
    fechaDesde: [this.fechasIniciales.fechaDesde],

    fechaHasta: [this.fechasIniciales.fechaHasta],
  });

  private readonly filtroSubject = new BehaviorSubject<FiltroFlujoCaja>({
    fechaDesde: this.fechasIniciales.fechaDesde,

    fechaHasta: this.fechasIniciales.fechaHasta,
  });

  readonly flujoCaja$ = this.filtroSubject.pipe(
    switchMap((filtro) =>
      this.flujoCajaService.obtenerFlujoCaja(
        filtro.fechaDesde,
        filtro.fechaHasta,
      ),
    ),
  );

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();

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
