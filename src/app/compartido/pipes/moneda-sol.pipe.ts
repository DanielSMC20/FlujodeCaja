import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'monedaSol',
  standalone: true
})
export class MonedaSolPipe implements PipeTransform {
  transform(value: number | null | undefined, mostrarSigno = false): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const formatted = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value));

    if (!mostrarSigno || value === 0) {
      return value < 0 ? `- ${formatted}` : formatted;
    }

    return `${value > 0 ? '+ ' : '- '}${formatted}`;
  }
}
