import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { FlujoCajaDiario } from '../../../../nucleo/modelos/dashboard.model';
import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import { ArrowRight, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-tabla-flujo-diario',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    MonedaSolPipe,
    LucideAngularModule,
  ],

  templateUrl: './tabla-flujo-diario.component.html',

  styleUrl: './tabla-flujo-diario.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaFlujoDiarioComponent {

  readonly ArrowRight = ArrowRight;

  @Input({ required: true })
  data: FlujoCajaDiario[] = [];

  get saldoActual(): number {

    if (!this.data.length) {
      return 0;
    }

    return this.data[this.data.length - 1].saldo;
  }

}
