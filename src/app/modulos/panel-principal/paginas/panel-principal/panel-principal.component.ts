import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  LucideAngularModule,
} from 'lucide-angular';

import { EMPTY, catchError, defer, finalize, shareReplay } from 'rxjs';

import Swal from 'sweetalert2';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

import { DashboardService } from '../../../../nucleo/servicios/dashboard.service';

@Component({
  selector: 'app-panel-principal',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    LucideAngularModule,
    MonedaSolPipe,
  ],

  templateUrl: './panel-principal.component.html',

  styleUrl: './panel-principal.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPrincipalComponent implements OnDestroy {
  private readonly dashboardService = inject(DashboardService);

  private temporizadorCarga?: ReturnType<typeof setTimeout>;

  private alertaCargaAbierta = false;

  /* =========================================================
     AÑOS DINÁMICOS
     ========================================================= */

  readonly anioActual = new Date().getFullYear();

  readonly anioDesde = this.anioActual - 2;

  /* =========================================================
     ICONOS
     ========================================================= */

  readonly iconos = {
    periodo: CalendarDays,

    flujo: ChartNoAxesCombined,

    siguiente: ArrowRight,
  };

  /* =========================================================
     RESUMEN ÚLTIMOS 3 AÑOS
     ========================================================= */

  readonly resumenAnual$ = defer(() => {
    this.mostrarCarga();

    return this.dashboardService.obtenerResumenAnual(this.anioActual);
  }).pipe(
    catchError((error: unknown) => {
      this.mostrarErrorCarga(error);

      return EMPTY;
    }),

    finalize(() => this.ocultarCarga()),

    shareReplay({
      bufferSize: 1,
      refCount: true,
    }),
  );

  /* =========================================================
     DESTRUCCIÓN
     ========================================================= */

  ngOnDestroy(): void {
    this.ocultarCarga();
  }

  /* =========================================================
     CARGA
     ========================================================= */

  private mostrarCarga(): void {
    if (this.temporizadorCarga) {
      clearTimeout(this.temporizadorCarga);
    }

    this.temporizadorCarga = setTimeout(() => {
      this.alertaCargaAbierta = true;

      void Swal.fire({
        title: 'Actualizando resumen',

        text: 'Estamos calculando el comparativo de los últimos 3 años.',

        allowOutsideClick: false,

        allowEscapeKey: false,

        showConfirmButton: false,

        heightAuto: false,

        didOpen: () => Swal.showLoading(),
      });
    }, 300);
  }

  private ocultarCarga(): void {
    if (this.temporizadorCarga) {
      clearTimeout(this.temporizadorCarga);

      this.temporizadorCarga = undefined;
    }

    if (this.alertaCargaAbierta) {
      Swal.close();

      this.alertaCargaAbierta = false;
    }
  }

  /* =========================================================
     ERROR
     ========================================================= */

  private mostrarErrorCarga(error: unknown): void {
    this.ocultarCarga();

    console.error('Error cargando resumen anual:', error);

    void Swal.fire({
      icon: 'warning',

      title: 'No se pudo cargar el resumen',

      text:
        error instanceof Error
          ? error.message
          : 'No se pudo consultar el resumen anual del flujo de caja.',

      confirmButtonText: 'Entendido',

      confirmButtonColor: '#123f5d',

      heightAuto: false,
    });
  }
}
