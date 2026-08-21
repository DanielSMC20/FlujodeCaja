import {
  CommonModule,
} from '@angular/common';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

import {
  EvolucionSaldo,
} from '../../../../nucleo/modelos/dashboard.model';

import {
  MonedaSolPipe,
} from '../../../../compartido/pipes/moneda-sol.pipe';


Chart.register(
  ...registerables,
);


@Component({
  selector: 'app-grafico-saldo',

  standalone: true,

  imports: [
    CommonModule,
    MonedaSolPipe,
  ],

  templateUrl:
    './grafico-saldo.component.html',

  styleUrl:
    './grafico-saldo.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class GraficoSaldoComponent
  implements
    AfterViewInit,
    OnChanges,
    OnDestroy {

  @Input({ required: true })
  data!: EvolucionSaldo;

  @Input()
  titulo =
    'Evolución del saldo';

  @Input()
  subtitulo =
    'Saldo acumulado del periodo';

  @Input()
  variacionTexto = '';

  @ViewChild('canvas')
  canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'line'>;


  get saldoActual(): number {

    if (
      !this.data?.valores?.length
    ) {
      return 0;
    }

    return this.data.valores[
      this.data.valores.length - 1
    ];

  }


  ngAfterViewInit(): void {
    this.renderizar();
  }


  ngOnChanges(
    _: SimpleChanges,
  ): void {

    this.renderizar();

  }


  ngOnDestroy(): void {

    this.chart?.destroy();

  }


  private renderizar(): void {

    if (
      !this.canvas?.nativeElement ||
      !this.data
    ) {
      return;
    }


    this.chart?.destroy();


    const config:
      ChartConfiguration<'line'> = {

      type: 'line',

      data: {

        labels:
          this.data.etiquetas,

        datasets: [
          {

            label: 'Saldo',

            data:
              this.data.valores,

            borderColor:
              '#2563eb',

            backgroundColor:
              'rgba(37, 99, 235, 0.10)',

            fill: true,

            tension: 0.35,

            pointBackgroundColor:
              '#2563eb',

            pointBorderColor:
              '#ffffff',

            pointBorderWidth: 2,

            pointRadius: 4,

          },
        ],

      },


      options: {

        responsive: true,

        maintainAspectRatio: false,

        interaction: {
          mode: 'index',
          intersect: false,
        },

        plugins: {

          legend: {
            display: false,
          },

        },

        scales: {

          y: {

            beginAtZero: false,

            grid: {
              color:
                'rgba(148, 163, 184, 0.16)',
            },

          },

          x: {

            grid: {
              display: false,
            },

          },

        },

      },

    };


    this.chart =
      new Chart(
        this.canvas.nativeElement,
        config,
      );

  }

}