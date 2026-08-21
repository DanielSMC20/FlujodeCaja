import { Injectable } from '@angular/core';

import { Observable, map } from 'rxjs';

import {
  FlujoCajaPorDia,
  ResultadoFlujoCaja,
} from '../modelos/flujo-caja.model';

import { Movimiento } from '../modelos/movimiento';

import { MovimientoService } from './movimiento.service';

@Injectable({
  providedIn: 'root',
})
export class FlujoCajaService {
  constructor(private readonly movimientoService: MovimientoService) {}

  obtenerFlujoCaja(
    fechaDesde?: string,
    fechaHasta?: string,
  ): Observable<ResultadoFlujoCaja> {
    return this.movimientoService.listarMovimientos().pipe(
      map((movimientos) => {
        const movimientosFiltrados = this.filtrarMovimientos(
          movimientos,
          fechaDesde,
          fechaHasta,
        );

        const filas = this.agruparPorDia(movimientosFiltrados);

        const totalIngresos = movimientosFiltrados
          .filter((movimiento) => movimiento.tipoMovimiento === 1)
          .reduce((total, movimiento) => total + movimiento.monto, 0);

        const totalEgresos = movimientosFiltrados
          .filter((movimiento) => movimiento.tipoMovimiento === 2)
          .reduce((total, movimiento) => total + movimiento.monto, 0);

        return {
          resumen: {
            totalIngresos,

            totalEgresos,

            neto: totalIngresos - totalEgresos,

            cantidadMovimientos: movimientosFiltrados.length,

            diasConMovimiento: filas.length,
          },

          filas,
        };
      }),
    );
  }

  private filtrarMovimientos(
    movimientos: Movimiento[],
    fechaDesde?: string,
    fechaHasta?: string,
  ): Movimiento[] {
    return movimientos.filter((movimiento) => {
      if (movimiento.tipoMovimiento === 2 && movimiento.bCancelado === 0) {
        return false;
      }

      if (fechaDesde && movimiento.fechaMovimiento < fechaDesde) {
        return false;
      }

      if (fechaHasta && movimiento.fechaMovimiento > fechaHasta) {
        return false;
      }

      return true;
    });
  }

  private agruparPorDia(movimientos: Movimiento[]): FlujoCajaPorDia[] {
    const agrupado = new Map<string, FlujoCajaPorDia>();

    movimientos.forEach((movimiento) => {
      const fecha = movimiento.fechaMovimiento;

      const filaActual = agrupado.get(fecha) ?? {
        fecha,

        cantidadMovimientos: 0,

        ingresos: 0,

        egresos: 0,

        neto: 0,
      };

      filaActual.cantidadMovimientos++;

      if (movimiento.tipoMovimiento === 1) {
        filaActual.ingresos += movimiento.monto;
      }

      if (movimiento.tipoMovimiento === 2) {
        filaActual.egresos += movimiento.monto;
      }

      filaActual.neto = filaActual.ingresos - filaActual.egresos;

      agrupado.set(fecha, filaActual);
    });

    return [...agrupado.values()].sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );
  }
}
