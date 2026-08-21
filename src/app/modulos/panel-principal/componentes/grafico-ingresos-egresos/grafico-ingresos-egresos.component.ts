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

import { ComparacionSemanal } from '../../../../nucleo/modelos/dashboard.model';

Chart.register(...registerables);

@Component({
  selector: 'app-grafico-ingresos-egresos',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './grafico-ingresos-egresos.component.html',

  styleUrl: './grafico-ingresos-egresos.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoIngresosEgresosComponent
  implements AfterViewInit, OnChanges
{
  @Input({
    required: true,
  })
  data!: ComparacionSemanal;

  @ViewChild('canvas')
  canvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'bar'>;

  get totalIngresos(): number {
    return this.data?.ingresos?.reduce((total, valor) => total + valor, 0) ?? 0;
  }

  get totalEgresos(): number {
    return this.data?.egresos?.reduce((total, valor) => total + valor, 0) ?? 0;
  }

  get neto(): number {
    return this.totalIngresos - this.totalEgresos;
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

    const indicesVisibles = this.data.etiquetas
      .map((_, index) => index)
      .filter(
        (index) =>
          (this.data.ingresos[index] ?? 0) > 0 ||
          (this.data.egresos[index] ?? 0) > 0,
      );

    const etiquetas = indicesVisibles.map(
      (index) => this.data.etiquetas[index],
    );

    const ingresos = indicesVisibles.map((index) => this.data.ingresos[index]);

    const egresos = indicesVisibles.map((index) => this.data.egresos[index]);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',

      data: {
        labels: etiquetas,

        datasets: [
          {
            label: 'Ingresos',

            data: ingresos,

            backgroundColor: '#2cad88',

            borderRadius: 5,

            borderSkipped: false,

            categoryPercentage: 0.58,

            barPercentage: 0.58,
          },

          {
            label: 'Egresos',

            data: egresos,

            backgroundColor: '#ee6b77',

            borderRadius: 5,

            borderSkipped: false,

            categoryPercentage: 0.58,

            barPercentage: 0.58,
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

            titleColor: '#ffffff',

            bodyColor: '#e2e8f0',

            callbacks: {
              label: (context) => {
                const valor = Number(context.raw ?? 0);

                return `${context.dataset.label}: ${this.formatearMoneda(valor)}`;
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
                size: 11,
              },
            },
          },

          y: {
            beginAtZero: true,

            border: {
              display: false,
            },

            grid: {
              color: 'rgba(135, 157, 184, 0.16)',
            },

            ticks: {
              display: false,
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
