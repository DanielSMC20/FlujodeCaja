import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import { ResultadoFlujoCaja } from '../modelos/flujo-caja.model';

interface FlujoCajaBackendResponse {
  resumen: {
    fechaDesde: string | null;
    fechaHasta: string | null;
    saldoInicialReal: number;
    saldoInicialProyectado: number;
    totalIngresos: number;
    totalEgresosPagados: number;
    totalEgresosProyectados: number;
    saldoFinalReal: number;
    saldoFinalProyectado: number;
  };
  detalle: Array<{
    fecha: string;
    ingresos: number;
    egresosPagados: number;
    egresosProyectados: number;
    flujoReal: number;
    flujoProyectado: number;
    saldoReal: number;
    saldoProyectado: number;
  }>;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class FlujoCajaService {
  private readonly http = inject(HttpClient);

  obtenerFlujoCaja(
    fechaDesde?: string,
    fechaHasta?: string,
  ): Observable<ResultadoFlujoCaja> {
    let params = new HttpParams();

    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }

    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }

    return this.http
      .get<FlujoCajaBackendResponse>(`${API_CONFIG.baseUrl}/flujo-caja`, {
        params,
      })
      .pipe(
        map((response) => ({
          resumen: {
            fechaDesde: response.resumen.fechaDesde,
            fechaHasta: response.resumen.fechaHasta,
            saldoInicialReal: Number(response.resumen.saldoInicialReal ?? 0),
            saldoInicialProyectado: Number(
              response.resumen.saldoInicialProyectado ?? 0,
            ),
            totalIngresos: Number(response.resumen.totalIngresos ?? 0),
            totalEgresosPagados: Number(
              response.resumen.totalEgresosPagados ?? 0,
            ),
            totalEgresosProyectados: Number(
              response.resumen.totalEgresosProyectados ?? 0,
            ),
            saldoFinalReal: Number(response.resumen.saldoFinalReal ?? 0),
            saldoFinalProyectado: Number(
              response.resumen.saldoFinalProyectado ?? 0,
            ),
          },
          filas: (response.detalle ?? []).map((fila) => ({
            fecha: fila.fecha,
            ingresos: Number(fila.ingresos ?? 0),
            egresosPagados: Number(fila.egresosPagados ?? 0),
            egresosProyectados: Number(fila.egresosProyectados ?? 0),
            flujoReal: Number(fila.flujoReal ?? 0),
            flujoProyectado: Number(fila.flujoProyectado ?? 0),
            saldoReal: Number(fila.saldoReal ?? 0),
            saldoProyectado: Number(fila.saldoProyectado ?? 0),
          })),
        })),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const mensaje = (error.error as ApiErrorResponse | null)?.message;

    if (mensaje) {
      return mensaje;
    }

    return error.status === 0
      ? 'No se pudo conectar con el servidor.'
      : 'No se pudo obtener el flujo de caja.';
  }
}
