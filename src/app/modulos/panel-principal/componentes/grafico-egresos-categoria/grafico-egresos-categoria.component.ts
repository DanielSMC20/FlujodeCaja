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

import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';

import { DistribucionEgreso } from '../../../../nucleo/modelos/dashboard.model';

Chart.register(...registerables);

@Component({
  selector: 'app-grafico-egresos-categoria',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './grafico-egresos-categoria.component.html',

  styleUrl: './grafico-egresos-categoria.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoEgresosCategoriaComponent
  implements AfterViewInit, OnChanges
{
  @Input({
    required: true,
  })
  data!: DistribucionEgreso[];

  @ViewChild('canvas')
  canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'doughnut'>;

  private readonly colores = [
    '#2563eb',
    '#3b82f6',
    '#60a5fa',
    '#93c5fd',
    '#1d4ed8',
    '#6366f1',
    '#818cf8',
  ];

  get totalEgresos(): number {
    return this.data?.reduce((total, item) => total + item.monto, 0) ?? 0;
  }

  get categoriasOrdenadas(): DistribucionEgreso[] {
    return [...(this.data ?? [])].sort((a, b) => b.monto - a.monto);
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

  calcularPorcentaje(monto: number): number {
    if (this.totalEgresos <= 0) {
      return 0;
    }

    return (monto / this.totalEgresos) * 100;
  }

  obtenerColor(index: number): string {
    return this.colores[index % this.colores.length];
  }

  private render(): void {
    if (!this.canvas?.nativeElement || !this.data) {
      return;
    }

    this.chart?.destroy();

    const datos = this.categoriasOrdenadas;

    const pluginCentro: Plugin<'doughnut'> = {
      id: 'textoCentro',

      afterDraw: (chart) => {
        const { ctx, chartArea } = chart;

        if (!chartArea) {
          return;
        }

        const centroX = (chartArea.left + chartArea.right) / 2;

        const centroY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();

        ctx.textAlign = 'center';

        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#0f172a';

        ctx.font = '700 15px Inter, sans-serif';

        ctx.fillText(
          this.formatearMoneda(this.totalEgresos),
          centroX,
          centroY - 7,
        );

        ctx.fillStyle = '#94a3b8';

        ctx.font = '500 10px Inter, sans-serif';

        ctx.fillText('Total egresos', centroX, centroY + 13);

        ctx.restore();
      },
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',

      data: {
        labels: datos.map((item) => item.categoria),

        datasets: [
          {
            data: datos.map((item) => item.monto),

            backgroundColor: datos.map((_, index) => this.obtenerColor(index)),

            borderColor: '#ffffff',

            borderWidth: 3,

            hoverOffset: 5,

            spacing: 1,
          },
        ],
      },

      options: {
        responsive: true,

        maintainAspectRatio: false,

        cutout: '72%',

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

                const porcentaje = this.calcularPorcentaje(valor);

                return `${this.formatearMoneda(valor)} · ${porcentaje.toFixed(1)}%`;
              },
            },
          },
        },
      },

      plugins: [pluginCentro],
    };

    this.chart = new Chart(this.canvas.nativeElement, config);
  }
}
