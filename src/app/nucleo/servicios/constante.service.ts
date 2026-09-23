import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import { ConstanteSistema } from '../modelos/constante-sistema';

interface ConstanteBackendResponse {
  valor: number;
  descripcion: string;
  abreviatura?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ConstanteService {
  private readonly http = inject(HttpClient);

  private readonly cache = new Map<number, Observable<ConstanteSistema[]>>();

  private readonly valores = new Map<string, string>();

  /*
   * Estos datos solo sirven como respaldo
   * si el backend no responde.
   */
  private readonly respaldo: ConstanteSistema[] = [
    {
      nConstante: 100,
      nValor: 1,
      cDescripcion: 'Ingreso',
    },

    {
      nConstante: 100,
      nValor: 2,
      cDescripcion: 'Egreso',
    },

    {
      nConstante: 200,
      nValor: 1,
      cDescripcion: 'Efectivo',
    },

    {
      nConstante: 200,
      nValor: 2,
      cDescripcion: 'Tarjeta / POS',
    },

    {
      nConstante: 200,
      nValor: 9,
      cDescripcion: 'No especificado',
    },

    {
      nConstante: 300,
      nValor: 1,
      cDescripcion: 'Factura',
    },

    {
      nConstante: 300,
      nValor: 2,
      cDescripcion: 'Boleta de venta',
    },

    {
      nConstante: 300,
      nValor: 3,
      cDescripcion: 'Recibo por honorarios',
    },

    {
      nConstante: 300,
      nValor: 4,
      cDescripcion: 'Ticket o nota de venta',
    },

    {
      nConstante: 300,
      nValor: 5,
      cDescripcion: 'Sin comprobante',
    },

    {
      nConstante: 400,
      nValor: 1,
      cDescripcion: 'Soles',
    },

    {
      nConstante: 500,
      nValor: 1,
      cDescripcion: 'Registro manual',
    },

    {
      nConstante: 500,
      nValor: 2,
      cDescripcion: 'Registro asistido por XML',
    },

    {
      nConstante: 500,
      nValor: 3,
      cDescripcion: 'Importación desde Excel',
    },

    {
      nConstante: 600,
      nValor: 1,
      cDescripcion: 'Caja',
    },

    {
      nConstante: 600,
      nValor: 2,
      cDescripcion: 'Cuenta bancaria',
    },
  ];

  private readonly codigosBase = [100, 200, 300, 400, 500, 600];

  constructor() {
    /*
     * Primero tenemos respaldo inmediato.
     */
    this.guardarEnMemoria(this.respaldo);

    /*
     * Luego recuperamos los valores reales
     * desde Spring Boot.
     */
    for (const codigo of this.codigosBase) {
      this.obtenerConstante(codigo).subscribe();
    }
  }

  obtenerConstante(nConstante: number): Observable<ConstanteSistema[]> {
    const existente = this.cache.get(nConstante);

    if (existente) {
      return existente;
    }

    const respaldoCodigo = this.respaldo.filter(
      (item) => item.nConstante === nConstante,
    );

    const consulta$ = this.http
      .get<
        ConstanteBackendResponse[]
      >(`${API_CONFIG.baseUrl}/constantes/${nConstante}`)
      .pipe(
        map((items) => {
          const constantes = (items ?? []).map((item) => ({
            nConstante,

            nValor: Number(item.valor),

            cDescripcion: item.descripcion ?? '',
          }));

          /*
           * Si por alguna razón el backend
           * devuelve una lista vacía,
           * usamos el respaldo.
           */
          return constantes.length > 0 ? constantes : respaldoCodigo;
        }),

        tap((items) => this.guardarEnMemoria(items)),

        catchError((_error: HttpErrorResponse) => of(respaldoCodigo)),

        shareReplay({
          bufferSize: 1,
          refCount: false,
        }),
      );

    this.cache.set(nConstante, consulta$);

    return consulta$;
  }

  obtenerDescripcion(nConstante: number, nValor: number): string {
    return this.valores.get(`${nConstante}:${nValor}`) ?? '';
  }

  private guardarEnMemoria(items: ConstanteSistema[]): void {
    for (const item of items) {
      this.valores.set(`${item.nConstante}:${item.nValor}`, item.cDescripcion);
    }
  }
}
