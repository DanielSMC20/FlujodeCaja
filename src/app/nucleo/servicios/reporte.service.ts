import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import {
  FiltroReporteMovimientos,
  ResultadoReporteMovimientos,
} from '../modelos/reporte.model';

interface ReporteBackendResponse {
  resumen: {
    cantidadRegistros: number;
    cantidadAnulados: number;
    totalIngresos: number;
    totalEgresosPagados: number;
    totalEgresosProyectados: number;
  };
  movimientos: Array<{
    id: number;
    fechaMovimiento: string;
    fechaProyectada?: string | null;
    fechaPago?: string | null;
    tipoMovimiento: number;
    tipoMovimientoDescripcion: string;
    categoriaId: number;
    categoria: string;
    descripcion: string;
    monto: number;
    medioPago?: number | null;
    medioPagoDescripcion?: string | null;
    tipoComprobante?: number | null;
    tipoComprobanteDescripcion?: string | null;
    moneda?: number | null;
    monedaDescripcion?: string | null;
    monedaAbreviatura?: string | null;
    origenRegistro?: number | null;
    origenRegistroDescripcion?: string | null;
    cancelado?: boolean | null;
    estado?: string | null;
    observacion?: string | null;
    activo?: boolean | null;
    fechaAnulacion?: string | null;
    motivoAnulacion?: string | null;
  }>;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);

  obtenerReporteMovimientos(
    filtro: FiltroReporteMovimientos,
  ): Observable<ResultadoReporteMovimientos> {
    let params = new HttpParams();

    if (filtro.fechaDesde) params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro.fechaHasta) params = params.set('fechaHasta', filtro.fechaHasta);
    if (filtro.tipoMovimiento) {
      params = params.set('tipoMovimiento', String(filtro.tipoMovimiento));
    }
    if (filtro.categoriaId) {
      params = params.set('categoriaId', String(filtro.categoriaId));
    }
    if (filtro.cancelado !== undefined) {
      params = params.set('cancelado', String(filtro.cancelado));
    }
    if (filtro.origenRegistro) {
      params = params.set('origenRegistro', String(filtro.origenRegistro));
    }
    params = params.set('incluirAnulados', String(filtro.incluirAnulados ?? false));

    return this.http
      .get<ReporteBackendResponse>(`${API_CONFIG.baseUrl}/reportes/movimientos`, {
        params,
      })
      .pipe(
        map((response) => {
          const totalIngresos = Number(response.resumen.totalIngresos ?? 0);
          const totalEgresosPagados = Number(
            response.resumen.totalEgresosPagados ?? 0,
          );

          return {
            resumen: {
              cantidadRegistros: Number(response.resumen.cantidadRegistros ?? 0),
              cantidadAnulados: Number(response.resumen.cantidadAnulados ?? 0),
              totalIngresos,
              totalEgresosPagados,
              totalEgresosProyectados: Number(
                response.resumen.totalEgresosProyectados ?? 0,
              ),
              netoReal: totalIngresos - totalEgresosPagados,
            },
            movimientos: (response.movimientos ?? []).map((movimiento) => ({
              id: movimiento.id,
              fechaMovimiento: movimiento.fechaMovimiento,
              fechaProyectada: movimiento.fechaProyectada ?? null,
              fechaPago: movimiento.fechaPago ?? null,
              tipoMovimiento: movimiento.tipoMovimiento,
              tipoMovimientoDescripcion:
                movimiento.tipoMovimientoDescripcion ||
                (movimiento.tipoMovimiento === 1 ? 'Ingreso' : 'Egreso'),
              categoriaId: movimiento.categoriaId,
              categoria: movimiento.categoria,
              descripcion: movimiento.descripcion,
              monto: Number(movimiento.monto ?? 0),
              medioPago: movimiento.medioPago ?? 9,
              medioPagoDescripcion:
                movimiento.medioPagoDescripcion ?? 'No especificado',
              tipoComprobante: movimiento.tipoComprobante ?? 5,
              tipoComprobanteDescripcion:
                movimiento.tipoComprobanteDescripcion ?? 'Sin comprobante',
              moneda: movimiento.moneda ?? 1,
              monedaDescripcion: movimiento.monedaDescripcion ?? 'Soles',
              monedaAbreviatura: movimiento.monedaAbreviatura ?? 'PEN',
              origenRegistro: movimiento.origenRegistro ?? 1,
              origenRegistroDescripcion:
                movimiento.origenRegistroDescripcion ?? 'Registro manual',
              cancelado: movimiento.cancelado ?? null,
              estado:
                movimiento.estado ??
                (movimiento.tipoMovimiento === 2
                  ? movimiento.cancelado
                    ? 'Pagado'
                    : 'Proyectado'
                  : 'Registrado'),
              observacion: movimiento.observacion ?? null,
              activo: movimiento.activo ?? true,
              fechaAnulacion: movimiento.fechaAnulacion ?? null,
              motivoAnulacion: movimiento.motivoAnulacion ?? null,
            })),
          };
        }),
        catchError((error: HttpErrorResponse) => {
          const mensaje = (error.error as ApiErrorResponse | null)?.message;
          return throwError(
            () =>
              new Error(
                mensaje ||
                  (error.status === 0
                    ? 'No se pudo conectar con el servidor.'
                    : 'No se pudo generar el reporte.'),
              ),
          );
        }),
      );
  }
}
