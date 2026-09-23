import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  map,
  shareReplay,
  throwError,
} from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import {
  ComparacionSemanal,
  DistribucionEgreso,
  EvolucionSaldo,
  FlujoCajaDiario,
  MovimientoResumen,
  NetoDiario,
  ResumenDashboard,
} from '../modelos/dashboard.model';
import { PeriodoDashboard } from '../modelos/filtros';
import { MovimientoService } from './movimiento.service';

interface DashboardBackendResponse {
  resumen: {
    totalIngresos: number;
    totalEgresosPagados: number;
    totalEgresosProyectados: number;
    saldoReal: number;
    saldoProyectado: number;
  };
  flujoDiario: Array<{
    fecha: string;
    ingresos: number;
    egresosPagados: number;
    egresosProyectados: number;
    flujoReal: number;
    flujoProyectado: number;
    saldoAcumuladoReal: number;
    saldoAcumuladoProyectado: number;
  }>;
  ultimosMovimientos: Array<{
    id: number;
    fecha: string;
    tipoMovimiento: number;
    tipoMovimientoDescripcion: string;
    categoriaId: number;
    categoria: string;
    descripcion: string;
    monto: number;
    cancelado: boolean | null;
    estado: string;
    moneda: number;
    monedaAbreviatura: string;
  }>;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly movimientoService = inject(MovimientoService);
  private readonly cache = new Map<PeriodoDashboard, Observable<DashboardBackendResponse>>();

  obtenerResumenDashboard(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<ResumenDashboard> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) => ({
        ingresosMes: Number(datos.resumen.totalIngresos ?? 0),
        egresosMes: Number(datos.resumen.totalEgresosPagados ?? 0),
        egresosProyectados: Number(
          datos.resumen.totalEgresosProyectados ?? 0,
        ),
        saldoAcumulado: Number(datos.resumen.saldoReal ?? 0),
        saldoProyectado: Number(datos.resumen.saldoProyectado ?? 0),
        saldoFechaTexto: `al ${this.formatearFecha(this.obtenerRango(periodo).hasta)}`,
        movimientosMes: datos.ultimosMovimientos?.length ?? 0,
        variacionIngresos: 0,
        variacionEgresos: 0,
        variacionSaldo: 0,
        variacionMovimientosHoy: 0,
      })),
    );
  }

  obtenerComparacionSemanal(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<ComparacionSemanal> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) => ({
        etiquetas: datos.flujoDiario.map((fila) =>
          this.formatearFechaCorta(fila.fecha),
        ),
        ingresos: datos.flujoDiario.map((fila) => Number(fila.ingresos ?? 0)),
        egresos: datos.flujoDiario.map((fila) =>
          Number(fila.egresosPagados ?? 0),
        ),
        neto: datos.flujoDiario.map((fila) => Number(fila.flujoReal ?? 0)),
      })),
    );
  }

  obtenerNetoDiario(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<NetoDiario> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) => ({
        etiquetas: datos.flujoDiario.map((fila) =>
          this.formatearFechaCorta(fila.fecha),
        ),
        valores: datos.flujoDiario.map((fila) => Number(fila.flujoReal ?? 0)),
        ingresos: datos.flujoDiario.map((fila) => Number(fila.ingresos ?? 0)),
        egresos: datos.flujoDiario.map((fila) =>
          Number(fila.egresosPagados ?? 0),
        ),
      })),
    );
  }

  obtenerEvolucionSaldo(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<EvolucionSaldo> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) => ({
        etiquetas: datos.flujoDiario.map((fila) =>
          this.formatearFechaCorta(fila.fecha),
        ),
        valores: datos.flujoDiario.map((fila) =>
          Number(fila.saldoAcumuladoReal ?? 0),
        ),
      })),
    );
  }

  obtenerDistribucionEgresos(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<DistribucionEgreso[]> {
    const rango = this.obtenerRango(periodo);

    return this.movimientoService.listarMovimientos(2).pipe(
      map((movimientos) => {
        const egresos = movimientos.filter(
          (movimiento) =>
            movimiento.bCancelado === 1 &&
            movimiento.fechaMovimiento >= rango.desde &&
            movimiento.fechaMovimiento <= rango.hasta,
        );
        const total = egresos.reduce((suma, movimiento) => suma + movimiento.monto, 0);
        const agrupado = new Map<string, number>();

        egresos.forEach((movimiento) => {
          agrupado.set(
            movimiento.categoria,
            (agrupado.get(movimiento.categoria) ?? 0) + movimiento.monto,
          );
        });

        return [...agrupado.entries()]
          .map(([categoria, monto]) => ({
            categoria,
            monto,
            porcentaje: total > 0 ? Number(((monto / total) * 100).toFixed(1)) : 0,
          }))
          .sort((a, b) => b.monto - a.monto);
      }),
    );
  }

  obtenerFlujoCaja(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<FlujoCajaDiario[]> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) =>
        datos.flujoDiario.slice(-5).map((fila) => ({
          fecha: this.formatearFecha(fila.fecha),
          concepto: 'Resumen del día',
          ingreso: Number(fila.ingresos ?? 0),
          egreso: Number(fila.egresosPagados ?? 0),
          saldo: Number(fila.saldoAcumuladoReal ?? 0),
        })),
      ),
    );
  }

  obtenerUltimosMovimientos(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<MovimientoResumen[]> {
    return this.obtenerDatos(periodo).pipe(
      map((datos) =>
        (datos.ultimosMovimientos ?? []).slice(0, 5).map((movimiento) => ({
          id: movimiento.id,
          fecha: movimiento.fecha,
          tipoMovimiento: movimiento.tipoMovimiento,
          categoria: movimiento.categoria,
          descripcion: movimiento.descripcion,
          monto: Number(movimiento.monto ?? 0),
          estado:
            movimiento.estado ||
            (movimiento.tipoMovimiento === 2
              ? movimiento.cancelado
                ? 'Pagado'
                : 'Proyectado'
              : 'Registrado'),
         
        })),
      ),
    );
  }

  private obtenerDatos(periodo: PeriodoDashboard): Observable<DashboardBackendResponse> {
    const existente = this.cache.get(periodo);

    if (existente) {
      return existente;
    }

    const rango = this.obtenerRango(periodo);
    const params = new HttpParams()
      .set('fechaDesde', rango.desde)
      .set('fechaHasta', rango.hasta)
      .set('cantidadUltimos', '10');

    const consulta$ = this.http
      .get<DashboardBackendResponse>(`${API_CONFIG.baseUrl}/dashboard`, {
        params,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.cache.delete(periodo);
          return throwError(() => new Error(this.obtenerMensajeError(error)));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.cache.set(periodo, consulta$);
    return consulta$;
  }

  private obtenerRango(periodo: PeriodoDashboard): { desde: string; hasta: string } {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (periodo === 'hoy') {
      const fecha = this.fechaATexto(hoy);
      return { desde: fecha, hasta: fecha };
    }

    if (periodo === 'semana') {
      const inicio = new Date(hoy);
      const dia = inicio.getDay();
      inicio.setDate(inicio.getDate() + (dia === 0 ? -6 : 1 - dia));
      return { desde: this.fechaATexto(inicio), hasta: this.fechaATexto(hoy) };
    }

    if (periodo === 'mes-anterior') {
      return {
        desde: this.fechaATexto(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
        hasta: this.fechaATexto(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
      };
    }

    if (periodo === 'anio') {
      return { desde: `${hoy.getFullYear()}-01-01`, hasta: this.fechaATexto(hoy) };
    }

    return {
      desde: this.fechaATexto(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
      hasta: this.fechaATexto(hoy),
    };
  }

  private fechaATexto(fecha: Date): string {
    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  private formatearFechaCorta(fecha: string): string {
    const [, mes, dia] = fecha.split('-');
    return mes && dia ? `${dia}/${mes}` : fecha;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const mensaje = (error.error as ApiErrorResponse | null)?.message;
    return mensaje ||
      (error.status === 0
        ? 'No se pudo conectar con el servidor.'
        : 'No se pudo obtener el dashboard.');
  }

  invalidarCache(periodo?: PeriodoDashboard): void {
  if (periodo) {
    this.cache.delete(periodo);
    return;
  }

  this.cache.clear();
}
}
