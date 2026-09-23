import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';

import { RouterLink } from '@angular/router';

import {
  CalendarDays,
  FileUp,
  ListFilter,
  LucideAngularModule,
  Plus,
} from 'lucide-angular';

import { BehaviorSubject, EMPTY, catchError, switchMap, tap } from 'rxjs';

import Swal from 'sweetalert2';

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
export class PanelPrincipalComponent implements OnDestroy {
  private readonly dashboardService = inject(DashboardService);

  private readonly sesionUsuarioService =
  inject(SesionUsuarioService);

get puedeGestionarMovimientos(): boolean {
  return this.sesionUsuarioService.puedeGestionarMovimientos;
}

  /* =========================================================
     CONTROL DEL LOADER
  ========================================================= */

  private temporizadorCarga?: ReturnType<typeof setTimeout>;

  private alertaCargaAbierta = false;

  /* =========================================================
     PERIODO
  ========================================================= */

  periodoSeleccionado: PeriodoDashboard = 'mes-actual';

  private readonly periodoSubject = new BehaviorSubject<PeriodoDashboard>(
    this.periodoSeleccionado,
  );

  /* =========================================================
     ICONOS
  ========================================================= */

  readonly iconos = {
    periodo: CalendarDays,
    nuevo: Plus,
    importar: FileUp,
    movimientos: ListFilter,
  };

  /* =========================================================
     CONSTRUCTOR
  ========================================================= */

  constructor() {
    this.dashboardService.invalidarCache();

    this.mostrarCarga();
  }

  /* =========================================================
     RESUMEN PRINCIPAL

     IMPORTANTE:
     Este observable controla el loader y el mensaje principal
     de error.
  ========================================================= */

  readonly resumen$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerResumenDashboard(periodo).pipe(
        tap(() => {
          /*
           * Si respondió correctamente,
           * cerramos el loader.
           */
          this.ocultarCarga();
        }),

        catchError((error: unknown) => {
          /*
           * Si falla, mostramos el error,
           * pero NO dejamos morir resumen$.
           */
          this.mostrarErrorCarga(error);

          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     COMPARACIÓN SEMANAL
  ========================================================= */

  readonly comparacionSemanal$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerComparacionSemanal(periodo).pipe(
        catchError((error) => {
          console.error('Error obteniendo comparación semanal:', error);

          /*
           * No mostramos otro SweetAlert.
           * El resumen ya maneja el error general.
           */
          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     NETO DIARIO
  ========================================================= */

  readonly netoDiario$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerNetoDiario(periodo).pipe(
        catchError((error) => {
          console.error('Error obteniendo neto diario:', error);

          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     DISTRIBUCIÓN DE EGRESOS
  ========================================================= */

  readonly distribucionEgresos$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerDistribucionEgresos(periodo).pipe(
        catchError((error) => {
          console.error('Error obteniendo distribución de egresos:', error);

          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     FLUJO DE CAJA
  ========================================================= */

  readonly flujoCaja$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerFlujoCaja(periodo).pipe(
        catchError((error) => {
          console.error('Error obteniendo flujo de caja:', error);

          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     ÚLTIMOS MOVIMIENTOS
  ========================================================= */

  readonly ultimosMovimientos$ = this.periodoSubject.pipe(
    switchMap((periodo) =>
      this.dashboardService.obtenerUltimosMovimientos(periodo).pipe(
        catchError((error) => {
          console.error('Error obteniendo últimos movimientos:', error);

          return EMPTY;
        }),
      ),
    ),
  );

  /* =========================================================
     ETIQUETA
  ========================================================= */

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

  /* =========================================================
     CAMBIO DE PERIODO
  ========================================================= */

  cambiarPeriodo(periodo: PeriodoDashboard): void {
    /*
     * Si hace clic nuevamente en el mismo
     * periodo no volvemos a consultar.
     */
    if (periodo === this.periodoSeleccionado) {
      return;
    }

    this.periodoSeleccionado = periodo;

    /*
     * Eliminamos solamente el cache
     * del periodo seleccionado.
     */
    this.dashboardService.invalidarCache(periodo);

    /*
     * Abrimos loading.
     */
    this.mostrarCarga();

    /*
     * Avisamos a TODOS los observables.
     */
    this.periodoSubject.next(periodo);
  }

  /* =========================================================
     FORMATOS
  ========================================================= */

  formatearVariacion(valor: number): string {
    return valor > 0 ? `+${valor}%` : `${valor}%`;
  }

  formatearVariacionCantidad(valor: number): string {
    return valor > 0 ? `+${valor}` : valor.toString();
  }

  /* =========================================================
     DESTROY
  ========================================================= */

  ngOnDestroy(): void {
    this.ocultarCarga();
  }

  /* =========================================================
     MOSTRAR LOADING
  ========================================================= */

  private mostrarCarga(): void {
    /*
     * Si ya existe un temporizador anterior,
     * lo eliminamos.
     */
    if (this.temporizadorCarga) {
      clearTimeout(this.temporizadorCarga);

      this.temporizadorCarga = undefined;
    }

    /*
     * Si por algún motivo quedó abierto
     * un SweetAlert anterior, lo cerramos.
     */
    if (this.alertaCargaAbierta) {
      Swal.close();

      this.alertaCargaAbierta = false;
    }

    /*
     * Esperamos 300 ms.
     *
     * Así evitamos mostrar el modal
     * cuando el backend responde rápido.
     */
    this.temporizadorCarga = setTimeout(() => {
      this.temporizadorCarga = undefined;

      this.alertaCargaAbierta = true;

      void Swal.fire({
        title: 'Actualizando información',

        text: 'Estamos consultando los movimientos y saldos de tu empresa.',

        allowOutsideClick: false,

        allowEscapeKey: false,

        showConfirmButton: false,

        heightAuto: false,

        didOpen: () => {
          Swal.showLoading();
        },
      });
    }, 300);
  }

  /* =========================================================
     OCULTAR LOADING
  ========================================================= */

  private ocultarCarga(): void {
    /*
     * Primero cancelamos un loader
     * que todavía no llegó a mostrarse.
     */
    if (this.temporizadorCarga) {
      clearTimeout(this.temporizadorCarga);

      this.temporizadorCarga = undefined;
    }

    /*
     * Si SweetAlert ya está visible,
     * lo cerramos.
     */
    if (this.alertaCargaAbierta) {
      Swal.close();

      this.alertaCargaAbierta = false;
    }
  }

  /* =========================================================
     ERROR
  ========================================================= */

  private mostrarErrorCarga(error: unknown): void {
    /*
     * SIEMPRE cerrar primero
     * el loader.
     */
    this.ocultarCarga();

    console.error('Error cargando dashboard:', error);

    const mensaje = this.obtenerMensajeError(error);

    void Swal.fire({
      icon: 'warning',

      title: 'Periodo no disponible',

      text: mensaje,

      confirmButtonText: 'Entendido',

      confirmButtonColor: '#123f5d',

      heightAuto: false,
    });
  }

  /* =========================================================
     EXTRAER MENSAJE DEL BACKEND
  ========================================================= */

  private obtenerMensajeError(error: unknown): string {
    /*
     * HttpErrorResponse normalmente
     * puede contener:
     *
     * error.error.message
     * error.error.mensaje
     * error.message
     */

    if (typeof error === 'object' && error !== null) {
      const respuesta = error as {
        error?:
          | {
              message?: string;
              mensaje?: string;
            }
          | string;

        message?: string;
      };

      /*
       * Backend:
       *
       * {
       *   "mensaje": "..."
       * }
       */
      if (typeof respuesta.error === 'object' && respuesta.error !== null) {
        if (respuesta.error.mensaje) {
          return respuesta.error.mensaje;
        }

        if (respuesta.error.message) {
          return respuesta.error.message;
        }
      }

      /*
       * Backend devuelve directamente
       * un string.
       */
      if (typeof respuesta.error === 'string') {
        return respuesta.error;
      }

      /*
       * Error normal.
       */
      if (respuesta.message) {
        return respuesta.message;
      }
    }

    return 'No se pudo actualizar la información ' + 'del dashboard.';
  }
}
