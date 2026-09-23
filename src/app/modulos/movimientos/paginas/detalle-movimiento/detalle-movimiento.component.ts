import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  CircleAlert,
  FileText,
  LucideAngularModule,
  Pencil,
} from 'lucide-angular';

import { Movimiento } from '../../../../nucleo/modelos/movimiento';

import { ConstanteService } from '../../../../nucleo/servicios/constante.service';

import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

@Component({
  selector: 'app-detalle-movimiento',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './detalle-movimiento.component.html',

  styleUrl: './detalle-movimiento.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleMovimientoComponent {
  readonly iconos = {
    volver: ArrowLeft,
    editar: Pencil,
    ingreso: ArrowUp,
    egreso: ArrowDown,
    xml: FileText,
    noEncontrado: CircleAlert,
    anular: Ban,
  };
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  cargandoMovimiento = true;
  errorCargaMovimiento = false;
  procesandoAnulacion = false;

  private readonly movimientoService = inject(MovimientoService);

  readonly constanteService = inject(ConstanteService);
  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  readonly movimiento$ = this.route.paramMap.pipe(
    map((parametros) => {
      const id = Number(parametros.get('id'));

      return Number.isInteger(id) && id > 0 ? id : null;
    }),

    switchMap((id) => {
      this.cargandoMovimiento = true;
      this.errorCargaMovimiento = false;

      this.changeDetectorRef.markForCheck();

      if (id === null) {
        this.cargandoMovimiento = false;

        return of(null);
      }

      return this.movimientoService.obtenerMovimientoPorId(id).pipe(
        catchError(() => {
          this.errorCargaMovimiento = true;

          return of(null);
        }),

        finalize(() => {
          this.cargandoMovimiento = false;

          this.changeDetectorRef.markForCheck();
        }),
      );
    }),
  );

  esIngreso(movimiento: Movimiento): boolean {
    return movimiento.tipoMovimiento === 1;
  }

  esEgreso(movimiento: Movimiento): boolean {
    return movimiento.tipoMovimiento === 2;
  }

  esProyectado(movimiento: Movimiento): boolean {
    return (
      this.esEgreso(movimiento) &&
      (movimiento.cancelado === false || movimiento.bCancelado === 0)
    );
  }

  puedeEditar(movimiento: Movimiento): boolean {
    if (!this.sesionUsuarioService.puedeGestionarMovimientos) {
      return false;
    }

    return this.esIngreso(movimiento) || this.esProyectado(movimiento);
  }

  tieneComprobante(movimiento: Movimiento): boolean {
    return movimiento.tipoComprobante !== 5;
  }

  fueRegistradoConXml(movimiento: Movimiento): boolean {
    return movimiento.origenRegistro === 2;
  }

  tieneObservacion(movimiento: Movimiento): boolean {
    return Boolean(movimiento.observacion?.trim());
  }

  estadoEgreso(movimiento: Movimiento): string {
    return this.esProyectado(movimiento) ? 'Proyectado' : 'Pagado';
  }

  etiquetaTipoMovimiento(valor: number): string {
    return this.constanteService.obtenerDescripcion(100, valor);
  }

  etiquetaMedioPago(valor: number): string {
    return this.constanteService.obtenerDescripcion(200, valor);
  }

  etiquetaComprobante(valor: number): string {
    return this.constanteService.obtenerDescripcion(300, valor);
  }

  etiquetaOrigen(valor: number): string {
    return (
      this.constanteService.obtenerDescripcion(500, valor) || 'No especificado'
    );
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return 'No registrado';
    }

    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    const [anio, mes, dia] = partes;

    return `${dia}/${mes}/${anio}`;
  }

  formatearFechaHora(fecha?: string | null): string {
    if (!fecha) {
      return 'No registrado';
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return fecha;
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

      timeZone: 'America/Lima',
    }).format(valor);
  }

  obtenerNumeroComprobante(movimiento: Movimiento): string {
    const serie = movimiento.serieComprobante?.trim();

    const numero = movimiento.numeroComprobante?.trim();

    if (serie && numero) {
      return `${serie}-${numero}`;
    }

    if (numero) {
      return numero;
    }

    return 'Sin número';
  }
  async anularMovimiento(movimiento: Movimiento): Promise<void> {
    if (movimiento.activo === false || this.procesandoAnulacion) {
      return;
    }

    const { default: Swal } = await import('sweetalert2');

    const resultado = await Swal.fire({
      title: 'Anular registro',

      html: `
        <p style="
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        ">
          El movimiento dejará de participar
          en los cálculos del flujo de caja,
          pero se conservará para auditoría.
        </p>
      `,

      icon: 'warning',

      input: 'textarea',

      inputLabel: 'Motivo de anulación',

      inputPlaceholder: 'Ejemplo: Registro duplicado.',

      inputAttributes: {
        maxlength: '300',
      },

      showCancelButton: true,

      confirmButtonText: 'Anular registro',

      cancelButtonText: 'Cancelar',

      confirmButtonColor: '#dc2626',

      reverseButtons: true,

      preConfirm: (valor) => {
        const motivo = String(valor ?? '').trim();

        if (!motivo) {
          Swal.showValidationMessage(
            'Debes indicar el motivo de la anulación.',
          );

          return false;
        }

        if (motivo.length > 300) {
          Swal.showValidationMessage(
            'El motivo no puede superar los 300 caracteres.',
          );

          return false;
        }

        return motivo;
      },
    });

    if (!resultado.isConfirmed || !resultado.value) {
      return;
    }

    this.movimientoService
      .anularMovimiento(movimiento.id, {
        motivo: resultado.value,
      })
      .subscribe({
        next: async () => {
          await Swal.fire({
            icon: 'success',

            title: 'Registro anulado',

            text: 'El movimiento fue anulado correctamente y ya no participa en los cálculos.',

            confirmButtonText: 'Aceptar',

            confirmButtonColor: '#17648a',

            heightAuto: false,
          });

          await this.router.navigateByUrl('/movimientos');
        },

        error: async (error: Error) => {
          this.procesandoAnulacion = false;

          this.changeDetectorRef.markForCheck();

          await Swal.fire({
            icon: 'error',

            title: 'No se pudo anular',

            text: error.message || 'Ocurrió un error al anular el movimiento.',

            confirmButtonText: 'Aceptar',

            heightAuto: false,
          });
        },

        complete: () => {
          this.procesandoAnulacion = false;

          this.changeDetectorRef.markForCheck();
        },
      });
  }
  puedeAnular(movimiento: Movimiento): boolean {
    return (
      movimiento.activo !== false &&
      this.sesionUsuarioService.puedeAnularMovimientos
    );
  }
}
