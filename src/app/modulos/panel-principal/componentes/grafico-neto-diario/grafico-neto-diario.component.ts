import { CommonModule } from '@angular/common';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { NetoDiario } from '../../../../nucleo/modelos/dashboard.model';

Chart.register(...registerables);

@Component({
  selector: 'app-grafico-neto-diario',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './grafico-neto-diario.component.html',

  styleUrl: './grafico-neto-diario.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoNetoDiarioComponent implements AfterViewInit, OnChanges {
  @Input({
    required: true,
  })
  data!: NetoDiario;

  @ViewChild('canvas')
  canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'bar'>;

  get totalNeto(): number {
    return this.data?.valores?.reduce((total, valor) => total + valor, 0) ?? 0;
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.render();
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',

      currency: 'PEN',

      minimumFractionDigits: 2,
    }).format(valor);
  }

  private render(): void {
    if (!this.canvas?.nativeElement || !this.data) {
      return;
    }

    this.chart?.destroy();

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',

      data: {
        labels: this.data.etiquetas,

        datasets: [
          {
            label: 'Neto del día',

            data: this.data.valores,

            backgroundColor: (context) => {
              const valor = Number(context.raw ?? 0);

              if (valor > 0) {
                return '#22c55e';
              }

              if (valor < 0) {
                return '#ef4444';
              }

              return '#cbd5e1';
            },

            borderRadius: 7,

            borderSkipped: false,

            barPercentage: 0.62,

            categoryPercentage: 0.75,
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

          tooltip: {
            backgroundColor: '#0f172a',

            padding: 12,

            cornerRadius: 8,

            callbacks: {
              label: (context) => {
                const valor = Number(context.raw ?? 0);

                return `Neto: ${this.formatearMoneda(valor)}`;
              },

              afterBody: (items) => {
                const index = items[0]?.dataIndex ?? 0;

                return [
                  `Ingresos: ${this.formatearMoneda(
                    this.data.ingresos[index] ?? 0,
                  )}`,
                  `Egresos: ${this.formatearMoneda(
                    this.data.egresos[index] ?? 0,
                  )}`,
                ];
              },
            },
          },
        },

        scales: {
          x: {
            border: {
              display: false,
            },

            grid: {
              display: false,
            },

            ticks: {
              color: '#64748b',

              font: {
                size: 10,
              },
            },
          },

          y: {
            border: {
              display: false,
            },

            grid: {
              color: (context) =>
                Number(context.tick.value) === 0
                  ? 'rgba(100, 116, 139, 0.3)'
                  : 'rgba(148, 163, 184, 0.10)',
            },

            ticks: {
              color: '#94a3b8',

              font: {
                size: 10,
              },

              callback: (value) => this.formatearValorCorto(Number(value)),
            },
          },
        },
      },
    };

    this.chart = new Chart(this.canvas.nativeElement, config);
  }

  private formatearValorCorto(valor: number): string {
    if (Math.abs(valor) >= 1000) {
      return `S/ ${(valor / 1000).toFixed(1)}k`;
    }

    return `S/ ${valor}`;
  }
}
