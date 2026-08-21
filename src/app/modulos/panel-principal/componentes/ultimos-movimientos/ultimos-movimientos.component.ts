import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { MovimientoResumen } from '../../../../nucleo/modelos/dashboard.model';
import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Ellipsis,
  ListFilter,
  LucideAngularModule,
} from 'lucide-angular';

@Component({
  selector: 'app-ultimos-movimientos',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './ultimos-movimientos.component.html',

  styleUrl: './ultimos-movimientos.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UltimosMovimientosComponent {
  readonly iconos = {
    verTodos: ArrowRight,
    ingreso: ArrowUp,
    egreso: ArrowDown,
    abrir: ChevronRight,
    mas: Ellipsis,
    vacio: ListFilter,
  };

  @Input({ required: true })
  data: MovimientoResumen[] = [];

  esIngreso(tipoMovimiento: number): boolean {
    return tipoMovimiento === 1;
  }

  formatearFecha(fecha: string): string {
    const [, mes, dia] = fecha.split('-');
    const nombres = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    return `${dia}-${nombres[Number(mes) - 1]}.`;
  }

  obtenerAnio(fecha: string): string {
    return fecha.split('-')[0] ?? '';
  }

}
