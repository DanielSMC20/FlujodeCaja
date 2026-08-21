import { AsyncPipe, CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { map, of, switchMap } from 'rxjs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleAlert,
  FileText,
  FileX,
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
    sinComprobante: FileX,
    noEncontrado: CircleAlert,
  };
  private readonly route = inject(ActivatedRoute);

  private readonly movimientoService = inject(MovimientoService);

  readonly constanteService = inject(ConstanteService);

  readonly movimiento$ = this.route.paramMap.pipe(
    map((parametros) => {
      const id = Number(parametros.get('id'));

      return Number.isInteger(id) && id > 0 ? id : null;
    }),

    switchMap((id) => {
      if (id === null) {
        return of(null);
      }

      return this.movimientoService.obtenerMovimientoPorId(id);
    }),
  );

  esIngreso(movimiento: Movimiento): boolean {
    return movimiento.tipoMovimiento === 1;
  }

  tieneComprobante(movimiento: Movimiento): boolean {
    return movimiento.tipoComprobante !== 5;
  }

  fueRegistradoConXml(movimiento: Movimiento): boolean {
    return movimiento.origenRegistro === 2;
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

  etiquetaMoneda(valor: number): string {
    return this.constanteService.obtenerDescripcion(400, valor);
  }

  etiquetaOrigen(valor: number): string {
    switch (valor) {
      case 1:
        return 'Registro manual';

      case 2:
        return 'Registro asistido por XML';

      case 3:
        return 'Importación Excel';

      default:
        return 'No especificado';
    }
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
}
