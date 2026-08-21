import { AsyncPipe, CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  LucideAngularModule,
  Plus,
} from 'lucide-angular';

import { BehaviorSubject, switchMap } from 'rxjs';

import { PeriodoDashboard } from '../../../../nucleo/modelos/filtros';

import { DashboardService } from '../../../../nucleo/servicios/dashboard.service';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

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
    MonedaSolPipe,
    FiltroPeriodoComponent,
    TarjetaIndicadorComponent,
    GraficoIngresosEgresosComponent,
    GraficoNetoDiarioComponent,
    GraficoEgresosCategoriaComponent,
    TablaFlujoDiarioComponent,
    UltimosMovimientosComponent,
    LucideAngularModule,
  ],

  templateUrl: './panel-principal.component.html',

  styleUrl: './panel-principal.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPrincipalComponent {
  readonly iconos = {
    registrar: Plus,
    verTodos: ArrowRight,
    consejo: CircleAlert,
    calendario: CalendarDays,
  };

  private readonly dashboardService = inject(DashboardService);

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

  readonly proximosPagos$ = this.dashboardService.obtenerPagosProximos();

  readonly fechaActualTexto = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
    .format(new Date(2026, 7, 20))
    .toUpperCase();

  cambiarPeriodo(periodo: PeriodoDashboard): void {
    this.periodoSeleccionado = periodo;

    this.periodoSubject.next(periodo);
  }

  formatearVariacion(valor: number): string {
    if (valor > 0) {
      return `+${valor}%`;
    }

    return `${valor}%`;
  }

  formatearVariacionCantidad(valor: number): string {
    if (valor > 0) {
      return `+${valor}`;
    }

    return valor.toString();
  }

  calcularNeto(ingresos: number, egresos: number): number {
    return ingresos - egresos;
  }

  sumarPagosProximos(pagos: { monto: number }[]): number {
    return pagos.reduce((total, pago) => total + pago.monto, 0);
  }

  obtenerDia(fecha: string): string {
    return fecha.split('-')[2] ?? '';
  }

  obtenerMes(fecha: string): string {
    const mes = Number(fecha.split('-')[1] ?? 1);

    return [
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC',
    ][mes - 1];
  }
}
