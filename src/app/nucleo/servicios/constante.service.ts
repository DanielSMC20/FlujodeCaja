import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ConstanteSistema } from '../modelos/constante-sistema';

@Injectable({ providedIn: 'root' })
export class ConstanteService {
  private readonly constantes: ConstanteSistema[] = [
    { nConstante: 100, nValor: 100, cDescripcion: 'Tipo de movimiento' },
    { nConstante: 100, nValor: 1, cDescripcion: 'Ingreso' },
    { nConstante: 100, nValor: 2, cDescripcion: 'Egreso' },
    { nConstante: 200, nValor: 200, cDescripcion: 'Medio de pago' },
    { nConstante: 200, nValor: 1, cDescripcion: 'Efectivo' },
    { nConstante: 200, nValor: 2, cDescripcion: 'Tarjeta / POS' },
    { nConstante: 200, nValor: 9, cDescripcion: 'No especificado' },
    { nConstante: 300, nValor: 300, cDescripcion: 'Tipo de comprobante' },
    { nConstante: 300, nValor: 1, cDescripcion: 'Factura' },
    { nConstante: 300, nValor: 2, cDescripcion: 'Boleta de venta' },
    { nConstante: 300, nValor: 3, cDescripcion: 'Recibo por honorarios' },
    { nConstante: 300, nValor: 4, cDescripcion: 'Ticket o nota de venta' },
    { nConstante: 300, nValor: 5, cDescripcion: 'Sin comprobante' },
    { nConstante: 400, nValor: 400, cDescripcion: 'Moneda' },
    { nConstante: 400, nValor: 1, cDescripcion: 'Soles' },
    { nConstante: 400, nValor: 2, cDescripcion: 'Dólares' },
    { nConstante: 500, nValor: 500, cDescripcion: 'Origen del registro' },
    { nConstante: 500, nValor: 1, cDescripcion: 'Registro manual' },
    { nConstante: 500, nValor: 2, cDescripcion: 'Registro asistido por XML' },
    { nConstante: 500, nValor: 3, cDescripcion: 'Importación desde Excel' },
    { nConstante: 600, nValor: 600, cDescripcion: 'Tipo de cuenta financiera' },
    { nConstante: 600, nValor: 1, cDescripcion: 'Caja' },
    { nConstante: 600, nValor: 2, cDescripcion: 'Cuenta bancaria' }
  ];

  obtenerConstante(nConstante: number): Observable<ConstanteSistema[]> {
    return of(this.constantes.filter((constante) => constante.nConstante === nConstante));
  }

  obtenerDescripcion(nConstante: number, nValor: number): string {
    return this.constantes.find((constante) => constante.nConstante === nConstante && constante.nValor === nValor)?.cDescripcion ?? '';
  }
}
