import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import {
  ArrowLeftRight,
  BadgeDollarSign,
  LucideAngularModule,
  TrendingDown,
  TrendingUp,
} from 'lucide-angular';

export type TarjetaTono =
  | 'success'
  | 'danger'
  | 'info'
  | 'accent';

export type TarjetaIcono =
  | 'ingresos'
  | 'egresos'
  | 'saldo'
  | 'movimientos';

@Component({
  selector: 'app-tarjeta-indicador',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './tarjeta-indicador.component.html',
  styleUrl: './tarjeta-indicador.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaIndicadorComponent {
  private readonly mapaIconos = {
    ingresos: TrendingUp,
    egresos: TrendingDown,
    saldo: BadgeDollarSign,
    movimientos: ArrowLeftRight,
  };

  get iconoActual() {
    return this.mapaIconos[this.icono];
  }

  @Input({ required: true })
  titulo!: string;

  @Input({ required: true })
  valor!: string;

  @Input()
  textoSecundario = '';

  @Input()
  variacion = '';

  @Input()
  tono: TarjetaTono = 'info';

  @Input()
  icono: TarjetaIcono = 'saldo';

}
