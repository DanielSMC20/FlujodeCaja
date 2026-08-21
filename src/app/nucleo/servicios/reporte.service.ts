import { Injectable } from '@angular/core';

import { Observable, map } from 'rxjs';

import {
  FiltroReporteMovimientos,
  ReporteMovimiento,
  ResultadoReporteMovimientos,
} from '../modelos/reporte.model';

import { Movimiento } from '../modelos/movimiento';

import { MovimientoService } from './movimiento.service';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  constructor(private readonly movimientoService: MovimientoService) {}

  obtenerReporteMovimientos(
    filtro: FiltroReporteMovimientos,
  ): Observable<ResultadoReporteMovimientos> {
    return this.movimientoService.listarMovimientos().pipe(
      map((movimientos) => {
        const movimientosFiltrados = this.filtrarMovimientos(
          movimientos,
          filtro,
        );

        const totalIngresos = this.sumarPorTipo(movimientosFiltrados, 1);

        const totalEgresos = this.sumarPorTipo(movimientosFiltrados, 2);

        const filas: ReporteMovimiento[] = movimientosFiltrados
          .sort((a, b) => {
            const fecha = b.fechaMovimiento.localeCompare(a.fechaMovimiento);

            if (fecha !== 0) {
              return fecha;
            }

            return b.id - a.id;
          })
          .map((movimiento) => ({
            id: movimiento.id,

            fechaMovimiento: movimiento.fechaMovimiento,

            tipoMovimiento: movimiento.tipoMovimiento,

            categoriaId: movimiento.categoriaId,

            categoria: movimiento.categoria,

            descripcion: movimiento.descripcion,

            monto: movimiento.monto,

            medioPago: movimiento.medioPago,

            tipoComprobante: movimiento.tipoComprobante,

            moneda: movimiento.moneda,

            origenRegistro: movimiento.origenRegistro,
          }));

        return {
          resumen: {
            totalIngresos,

            totalEgresos,

            neto: totalIngresos - totalEgresos,

            cantidadMovimientos: movimientosFiltrados.length,
          },

          movimientos: filas,
        };
      }),
    );
  }

  private filtrarMovimientos(
    movimientos: Movimiento[],
    filtro: FiltroReporteMovimientos,
  ): Movimiento[] {
    return movimientos.filter((movimiento) => {
      if (filtro.fechaDesde && movimiento.fechaMovimiento < filtro.fechaDesde) {
        return false;
      }

      if (filtro.fechaHasta && movimiento.fechaMovimiento > filtro.fechaHasta) {
        return false;
      }

      if (
        filtro.tipoMovimiento &&
        movimiento.tipoMovimiento !== filtro.tipoMovimiento
      ) {
        return false;
      }

      if (filtro.categoriaId && movimiento.categoriaId !== filtro.categoriaId) {
        return false;
      }

      return true;
    });
  }

  private sumarPorTipo(
    movimientos: Movimiento[],
    tipoMovimiento: number,
  ): number {
    return movimientos
      .filter((movimiento) => movimiento.tipoMovimiento === tipoMovimiento)
      .reduce((total, movimiento) => total + movimiento.monto, 0);
  }
}
