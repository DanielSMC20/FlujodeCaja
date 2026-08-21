import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { PeriodoDashboard } from '../../../../nucleo/modelos/filtros';

interface OpcionPeriodo {
  value: PeriodoDashboard;
  label: string;
}

@Component({
  selector: 'app-filtro-periodo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filtro-periodo.component.html',
  styleUrl: './filtro-periodo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltroPeriodoComponent {
  @Input() value: PeriodoDashboard = 'mes-actual';
  @Output() valueChange = new EventEmitter<PeriodoDashboard>();

  readonly opciones: OpcionPeriodo[] = [
    {
      value: 'hoy',
      label: 'Hoy',
    },
    {
      value: 'semana',
      label: 'Esta semana',
    },
    {
      value: 'mes-actual',
      label: 'Mes actual',
    },
    {
      value: 'mes-anterior',
      label: 'Mes anterior',
    },
    {
      value: 'anio',
      label: 'Este año',
    },
  ];

  seleccionar(value: PeriodoDashboard): void {
    this.valueChange.emit(value);
  }
}
