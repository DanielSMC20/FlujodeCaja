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
  Settings,
  WalletCards,
} from 'lucide-angular';
import { BehaviorSubject, EMPTY, catchError, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import { PeriodoDashboard } from '../../../../nucleo/modelos/filtros';
import { FlujoCajaService } from '../../../../nucleo/servicios/flujo-caja.service';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';
import { FiltroPeriodoComponent } from '../../componentes/filtro-periodo/filtro-periodo.component';

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
  ],
  templateUrl: './panel-principal.component.html',
  styleUrl: './panel-principal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPrincipalComponent implements OnDestroy {
  private readonly flujoCajaService = inject(FlujoCajaService);
  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  private temporizadorCarga?: ReturnType<typeof setTimeout>;
  private alertaCargaAbierta = false;

  periodoSeleccionado: PeriodoDashboard = 'mes-actual';

  private readonly periodoSubject = new BehaviorSubject<PeriodoDashboard>(
    this.periodoSeleccionado,
  );

  readonly iconos = {
    periodo: CalendarDays,
    saldo: WalletCards,
    configuracion: Settings,
    flujo: ChartNoAxesCombined,
    siguiente: ArrowRight,
  };

  get esAdministrador(): boolean {
    return this.sesionUsuarioService.esAdministrador;
  }

  readonly resumen$ = this.periodoSubject.pipe(
    switchMap((periodo) => {
      const rango = this.obtenerRango(periodo);

      this.mostrarCarga();

      return this.flujoCajaService
        .obtenerFlujoCaja(rango.desde, rango.hasta)
        .pipe(
          tap(() => this.ocultarCarga()),

          catchError((error: unknown) => {
            this.mostrarErrorCarga(error);

            return EMPTY;
          }),
        );
    }),
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
    if (periodo === this.periodoSeleccionado) {
      return;
    }

    this.periodoSeleccionado = periodo;

    this.periodoSubject.next(periodo);
  }

  ngOnDestroy(): void {
    this.ocultarCarga();
  }

  private obtenerRango(periodo: PeriodoDashboard): {
    desde: string;
    hasta: string;
  } {
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    if (periodo === 'hoy') {
      const fecha = this.fechaATexto(hoy);

      return {
        desde: fecha,
        hasta: fecha,
      };
    }

    if (periodo === 'semana') {
      const inicio = new Date(hoy);

      const dia = inicio.getDay();

      inicio.setDate(inicio.getDate() + (dia === 0 ? -6 : 1 - dia));

      return {
        desde: this.fechaATexto(inicio),
        hasta: this.fechaATexto(hoy),
      };
    }

    if (periodo === 'mes-anterior') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

      return {
        desde: this.fechaATexto(inicio),
        hasta: this.fechaATexto(fin),
      };
    }

    if (periodo === 'anio') {
      const inicio = new Date(hoy.getFullYear(), 0, 1);

      return {
        desde: this.fechaATexto(inicio),
        hasta: this.fechaATexto(hoy),
      };
    }

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    return {
      desde: this.fechaATexto(inicioMes),
      hasta: this.fechaATexto(hoy),
    };
  }

  private fechaATexto(fecha: Date): string {
    const anio = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, '0');

    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private mostrarCarga(): void {
    if (this.temporizadorCarga) {
      clearTimeout(this.temporizadorCarga);
    }

    this.temporizadorCarga = setTimeout(() => {
      this.alertaCargaAbierta = true;

      void Swal.fire({
        title: 'Actualizando resumen',

        text: 'Estamos calculando el resumen del flujo de caja.',

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

  private mostrarErrorCarga(error: unknown): void {
    this.ocultarCarga();

    console.error('Error cargando resumen del flujo:', error);

    void Swal.fire({
      icon: 'warning',

      title: 'No se pudo cargar el resumen',

      text:
        error instanceof Error
          ? error.message
          : 'No se pudo consultar el flujo de caja del periodo.',

      confirmButtonText: 'Entendido',

      confirmButtonColor: '#123f5d',

      heightAuto: false,
    });
  }
}
