import { AsyncPipe, CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { BehaviorSubject, combineLatest, map, switchMap } from 'rxjs';

import { FiltroReporteMovimientos } from '../../../../nucleo/modelos/reporte.model';

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
  readonly ChartNoAxesCombined = ChartNoAxesCombined;

  private readonly formBuilder = inject(FormBuilder);

  private readonly reporteService = inject(ReporteService);

  private readonly categoriaService = inject(CategoriaService);

  readonly constanteService = inject(ConstanteService);

  private readonly fechasIniciales = this.obtenerFechasIniciales();

  readonly formulario = this.formBuilder.nonNullable.group({
    fechaDesde: [this.fechasIniciales.fechaDesde],

    fechaHasta: [this.fechasIniciales.fechaHasta],

    tipoMovimiento: [0],

    categoriaId: [0],
  });

  private readonly filtroSubject =
    new BehaviorSubject<FiltroReporteMovimientos>({
      fechaDesde: this.fechasIniciales.fechaDesde,

      fechaHasta: this.fechasIniciales.fechaHasta,
    });

  readonly reporte$ = this.filtroSubject.pipe(
    switchMap((filtro) =>
      this.reporteService.obtenerReporteMovimientos(filtro),
    ),
  );

  private readonly tipoMovimientoSubject = new BehaviorSubject<number>(0);

  readonly categorias$ = combineLatest([
    this.categoriaService.listarCategorias(),

    this.tipoMovimientoSubject,
  ]).pipe(
    map(([categorias, tipoMovimiento]) => {
      if (tipoMovimiento === 0) {
        return categorias;
      }

      return categorias.filter(
        (categoria) => categoria.tipoMovimiento === tipoMovimiento,
      );
    }),
  );

  constructor() {
    this.formulario.controls.tipoMovimiento.valueChanges.subscribe(
      (tipoMovimiento) => {
        this.tipoMovimientoSubject.next(tipoMovimiento);

        this.formulario.controls.categoriaId.setValue(0, {
          emitEvent: false,
        });
      },
    );
  }

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();

    this.filtroSubject.next({
      fechaDesde: datos.fechaDesde || undefined,

      fechaHasta: datos.fechaHasta || undefined,

      tipoMovimiento:
        datos.tipoMovimiento > 0 ? datos.tipoMovimiento : undefined,

      categoriaId: datos.categoriaId > 0 ? datos.categoriaId : undefined,
    });
  }

  limpiarFiltros(): void {
    this.formulario.setValue({
      fechaDesde: '',

      fechaHasta: '',

      tipoMovimiento: 0,

      categoriaId: 0,
    });

    this.tipoMovimientoSubject.next(0);

    this.filtroSubject.next({});
  }

  etiquetaTipoMovimiento(tipoMovimiento: number): string {
    return this.constanteService.obtenerDescripcion(100, tipoMovimiento);
  }

  etiquetaMedioPago(medioPago: number): string {
    return this.constanteService.obtenerDescripcion(200, medioPago);
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
