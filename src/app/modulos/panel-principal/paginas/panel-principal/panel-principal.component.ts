import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CalendarDays,
  FileUp,
  ListFilter,
  LucideAngularModule,
  Plus,
} from 'lucide-angular';
import { BehaviorSubject, switchMap } from 'rxjs';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import { PeriodoDashboard } from '../../../../nucleo/modelos/filtros';
import { DashboardService } from '../../../../nucleo/servicios/dashboard.service';
import { FiltroPeriodoComponent } from '../../componentes/filtro-periodo/filtro-periodo.component';
import { GraficoEgresosCategoriaComponent } from '../../componentes/grafico-egresos-categoria/grafico-egresos-categoria.component';
import { GraficoIngresosEgresosComponent } from '../../componentes/grafico-ingresos-egresos/grafico-ingresos-egresos.component';
import { GraficoNetoDiarioComponent } from '../../componentes/grafico-neto-diario/grafico-neto-diario.component';
import { TablaFlujoDiarioComponent } from '../../componentes/tabla-flujo-diario/tabla-flujo-diario.component';
import { TarjetaIndicadorComponent } from '../../componentes/tarjeta-indicador/tarjeta-indicador.component';
import { UltimosMovimientosComponent } from '../../componentes/ultimos-movimientos/ultimos-movimientos.component';

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    LucideAngularModule,
    MonedaSolPipe,
    FiltroPeriodoComponent,
    TarjetaIndicadorComponent,
    GraficoIngresosEgresosComponent,
    GraficoNetoDiarioComponent,
    GraficoEgresosCategoriaComponent,
    TablaFlujoDiarioComponent,
    UltimosMovimientosComponent,
  ],
  templateUrl: './panel-principal.component.html',
  styleUrl: './panel-principal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPrincipalComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly iconos = {
    periodo: CalendarDays,
    nuevo: Plus,
    importar: FileUp,
    movimientos: ListFilter,
  };

  periodoSeleccionado: PeriodoDashboard = 'mes-actual';

  private readonly periodoSubject = new BehaviorSubject<PeriodoDashboard>(
    this.periodoSeleccionado,
  );

  readonly resumen$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerResumenDashboard(periodo),
    ),
  );

  readonly comparacionSemanal$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerComparacionSemanal(periodo),
    ),
  );

  readonly netoDiario$ = this.periodoSubject.pipe(
    switchMap((periodo) => this.dashboardService.obtenerNetoDiario(periodo)),
  );

  readonly distribucionEgresos$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerDistribucionEgresos(periodo),
    ),
  );

  readonly flujoCaja$ = this.periodoSubject.pipe(
    switchMap((periodo) => this.dashboardService.obtenerFlujoCaja(periodo)),
  );

  readonly ultimosMovimientos$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerUltimosMovimientos(periodo),
    ),
  );

  get etiquetaPeriodoSeleccionado(): string {
    const etiquetas: Record<PeriodoDashboard, string> = {
      hoy: 'Hoy',
      semana: 'Esta semana',
      'mes-actual': 'Mes actual',
      'mes-anterior': 'Mes anterior',
      anio: 'Este año',
      personalizado: 'Periodo personalizado',
    };

    return etiquetas[this.periodoSeleccionado];
  }

  cambiarPeriodo(periodo: PeriodoDashboard): void {
    this.periodoSeleccionado = periodo;
    this.periodoSubject.next(periodo);
  }

  formatearVariacion(valor: number): string {
    return valor > 0 ? `+${valor}%` : `${valor}%`;
  }

  formatearVariacionCantidad(valor: number): string {
    return valor > 0 ? `+${valor}` : valor.toString();
  }
}
