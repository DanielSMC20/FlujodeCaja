import { Injectable } from '@angular/core';

import { Observable, map } from 'rxjs';

import {
  ComparacionSemanal,
  DistribucionEgreso,
  EvolucionSaldo,
  FlujoCajaDiario,
  MovimientoResumen,
  ResumenDashboard,
  NetoDiario,
} from '../modelos/dashboard.model';

import { PeriodoDashboard } from '../modelos/filtros';

import { Movimiento } from '../modelos/movimiento';

import { MovimientoService } from './movimiento.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private readonly movimientoService: MovimientoService) {}

  obtenerNetoDiario(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<NetoDiario> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularNetoDiario(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerResumenDashboard(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<ResumenDashboard> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularResumen(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerComparacionSemanal(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<ComparacionSemanal> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularComparacion(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerEvolucionSaldo(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<EvolucionSaldo> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularEvolucionSaldo(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerDistribucionEgresos(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<DistribucionEgreso[]> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularDistribucionEgresos(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerFlujoCaja(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<FlujoCajaDiario[]> {
    return this.movimientoService
      .listarMovimientos()
      .pipe(
        map((movimientos) =>
          this.calcularFlujoCaja(
            this.filtrarMovimientosQueAfectanCaja(movimientos),
            periodo,
          ),
        ),
      );
  }

  obtenerUltimosMovimientos(
    periodo: PeriodoDashboard = 'mes-actual',
  ): Observable<MovimientoResumen[]> {
    return this.movimientoService.listarMovimientos().pipe(
      map((movimientos) => {
        const rango = this.obtenerRango(periodo);

        return movimientos
          .filter((movimiento) =>
            this.estaEnRango(
              movimiento.fechaMovimiento,
              rango.desde,
              rango.hasta,
            ),
          )
          .sort((a, b) => {
            const comparacionFecha = b.fechaMovimiento.localeCompare(
              a.fechaMovimiento,
            );

            if (comparacionFecha !== 0) {
              return comparacionFecha;
            }

            return b.id - a.id;
          })
          .slice(0, 5)
          .map((movimiento) => ({
            id: movimiento.id,

            fecha: movimiento.fechaMovimiento,

            tipoMovimiento: movimiento.tipoMovimiento,

            categoria: movimiento.categoria,

            descripcion: movimiento.descripcion,

            monto: movimiento.monto,

            estado:
              movimiento.tipoMovimiento === 2
                ? movimiento.bCancelado === 0
                  ? 'Proyectado'
                  : 'Pagado'
                : 'Registrado',

            origen:
              movimiento.origenRegistroDescripcion ??
              (movimiento.origenRegistro === 2
                ? 'Registro asistido por XML'
                : movimiento.origenRegistro === 3
                  ? 'Importación desde Excel'
                  : 'Registro manual'),

            medioPago:
              movimiento.medioPagoDescripcion ??
              (movimiento.medioPago === 2
                ? 'Tarjeta / POS'
                : movimiento.medioPago === 9
                  ? 'No especificado'
                  : 'Efectivo'),
          }));
      }),
    );
  }

  private calcularResumen(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): ResumenDashboard {
    const rango = this.obtenerRango(periodo);

    const periodoAnterior = this.obtenerPeriodoAnterior(
      rango.desde,
      rango.hasta,
    );

    const movimientosPeriodo = movimientos.filter((movimiento) =>
      this.estaEnRango(movimiento.fechaMovimiento, rango.desde, rango.hasta),
    );

    const movimientosAnteriores = movimientos.filter((movimiento) =>
      this.estaEnRango(
        movimiento.fechaMovimiento,
        periodoAnterior.desde,
        periodoAnterior.hasta,
      ),
    );

    const ingresos = this.sumarPorTipo(movimientosPeriodo, 1);

    const egresos = this.sumarPorTipo(movimientosPeriodo, 2);

    const ingresosAnteriores = this.sumarPorTipo(movimientosAnteriores, 1);

    const egresosAnteriores = this.sumarPorTipo(movimientosAnteriores, 2);

    const saldoAcumulado = movimientos
      .filter((movimiento) => movimiento.fechaMovimiento <= rango.hasta)
      .reduce(
        (saldo, movimiento) =>
          movimiento.tipoMovimiento === 1
            ? saldo + movimiento.monto
            : saldo - movimiento.monto,
        0,
      );

    const saldoAntesPeriodo = movimientos
      .filter((movimiento) => movimiento.fechaMovimiento < rango.desde)
      .reduce(
        (saldo, movimiento) =>
          movimiento.tipoMovimiento === 1
            ? saldo + movimiento.monto
            : saldo - movimiento.monto,
        0,
      );

    return {
      ingresosMes: ingresos,

      egresosMes: egresos,

      saldoAcumulado,

      saldoFechaTexto: `al ${this.formatearFecha(rango.hasta)}`,

      movimientosMes: movimientosPeriodo.length,

      variacionIngresos: this.calcularVariacion(ingresos, ingresosAnteriores),

      variacionEgresos: this.calcularVariacion(egresos, egresosAnteriores),

      variacionSaldo: this.calcularVariacion(saldoAcumulado, saldoAntesPeriodo),

      variacionMovimientosHoy:
        movimientosPeriodo.length - movimientosAnteriores.length,
    };
  }
  private calcularNetoDiario(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): NetoDiario {
    const rango = this.obtenerRango(periodo);

    const agrupado = new Map<
      string,
      {
        ingresos: number;
        egresos: number;
      }
    >();

    movimientos
      .filter((movimiento) =>
        this.estaEnRango(movimiento.fechaMovimiento, rango.desde, rango.hasta),
      )
      .forEach((movimiento) => {
        const fecha = movimiento.fechaMovimiento;

        const actual = agrupado.get(fecha) ?? {
          ingresos: 0,
          egresos: 0,
        };

        if (movimiento.tipoMovimiento === 1) {
          actual.ingresos += movimiento.monto;
        }

        if (movimiento.tipoMovimiento === 2) {
          actual.egresos += movimiento.monto;
        }

        agrupado.set(fecha, actual);
      });

    const fechas = [...agrupado.keys()].sort((a, b) => a.localeCompare(b));

    const ingresos = fechas.map((fecha) => agrupado.get(fecha)?.ingresos ?? 0);

    const egresos = fechas.map((fecha) => agrupado.get(fecha)?.egresos ?? 0);

    const valores = fechas.map((_, index) => ingresos[index] - egresos[index]);

    return {
      etiquetas: fechas.map((fecha) => this.formatearFechaCorta(fecha)),

      valores,

      ingresos,

      egresos,
    };
  }

  private calcularComparacion(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): ComparacionSemanal {
    const rango = this.obtenerRango(periodo);

    const movimientosPeriodo = movimientos.filter((movimiento) =>
      this.estaEnRango(movimiento.fechaMovimiento, rango.desde, rango.hasta),
    );

    if (periodo === 'anio') {
      const etiquetas: string[] = [];

      const ingresos: number[] = [];

      const egresos: number[] = [];

      const neto: number[] = [];

      const fechaDesde = this.fechaDesdeTexto(rango.desde);

      const fechaHasta = this.fechaDesdeTexto(rango.hasta);

      let fecha = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), 1);

      while (fecha <= fechaHasta) {
        const anio = fecha.getFullYear();

        const mes = fecha.getMonth();

        const movimientosMes = movimientosPeriodo.filter((movimiento) => {
          const fechaMovimiento = this.fechaDesdeTexto(
            movimiento.fechaMovimiento,
          );

          return (
            fechaMovimiento.getFullYear() === anio &&
            fechaMovimiento.getMonth() === mes
          );
        });

        const ingreso = this.sumarPorTipo(movimientosMes, 1);

        const egreso = this.sumarPorTipo(movimientosMes, 2);

        etiquetas.push(this.obtenerNombreMes(mes));

        ingresos.push(ingreso);

        egresos.push(egreso);

        neto.push(ingreso - egreso);

        fecha = new Date(anio, mes + 1, 1);
      }

      return {
        etiquetas,
        ingresos,
        egresos,
        neto,
      };
    }

    if (periodo === 'semana' || periodo === 'hoy') {
      const fechas = this.obtenerFechasEntre(rango.desde, rango.hasta);

      return {
        etiquetas: fechas.map((fecha) =>
          periodo === 'hoy' ? 'Hoy' : this.formatearFechaCorta(fecha),
        ),

        ingresos: fechas.map((fecha) =>
          this.sumarPorTipo(
            movimientosPeriodo.filter(
              (movimiento) => movimiento.fechaMovimiento === fecha,
            ),
            1,
          ),
        ),

        egresos: fechas.map((fecha) =>
          this.sumarPorTipo(
            movimientosPeriodo.filter(
              (movimiento) => movimiento.fechaMovimiento === fecha,
            ),
            2,
          ),
        ),

        neto: fechas.map((fecha) => {
          const movimientosFecha = movimientosPeriodo.filter(
            (movimiento) => movimiento.fechaMovimiento === fecha,
          );

          return (
            this.sumarPorTipo(movimientosFecha, 1) -
            this.sumarPorTipo(movimientosFecha, 2)
          );
        }),
      };
    }

    const semanas = [
      {
        desde: 1,
        hasta: 7,
        label: 'Sem 1',
      },
      {
        desde: 8,
        hasta: 14,
        label: 'Sem 2',
      },
      {
        desde: 15,
        hasta: 21,
        label: 'Sem 3',
      },
      {
        desde: 22,
        hasta: 28,
        label: 'Sem 4',
      },
      {
        desde: 29,
        hasta: 31,
        label: 'Sem 5',
      },
    ];

    const etiquetas: string[] = [];

    const ingresos: number[] = [];

    const egresos: number[] = [];

    const neto: number[] = [];

    semanas.forEach((semana) => {
      const movimientosSemana = movimientosPeriodo.filter((movimiento) => {
        const dia = Number(movimiento.fechaMovimiento.substring(8, 10));

        return dia >= semana.desde && dia <= semana.hasta;
      });

      if (
        movimientosSemana.length === 0 &&
        semana.desde > Number(rango.hasta.substring(8, 10))
      ) {
        return;
      }

      const ingreso = this.sumarPorTipo(movimientosSemana, 1);

      const egreso = this.sumarPorTipo(movimientosSemana, 2);

      etiquetas.push(semana.label);

      ingresos.push(ingreso);

      egresos.push(egreso);

      neto.push(ingreso - egreso);
    });

    return {
      etiquetas,
      ingresos,
      egresos,
      neto,
    };
  }

  private calcularEvolucionSaldo(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): EvolucionSaldo {
    const rango = this.obtenerRango(periodo);

    let saldo = movimientos
      .filter((movimiento) => movimiento.fechaMovimiento < rango.desde)
      .reduce(
        (total, movimiento) =>
          movimiento.tipoMovimiento === 1
            ? total + movimiento.monto
            : total - movimiento.monto,
        0,
      );

    if (periodo === 'anio') {
      const etiquetas: string[] = [];

      const valores: number[] = [];

      const inicio = this.fechaDesdeTexto(rango.desde);

      const fin = this.fechaDesdeTexto(rango.hasta);

      let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

      while (cursor <= fin) {
        const anio = cursor.getFullYear();

        const mes = cursor.getMonth();

        const movimientosMes = movimientos.filter((movimiento) => {
          const fecha = this.fechaDesdeTexto(movimiento.fechaMovimiento);

          return fecha.getFullYear() === anio && fecha.getMonth() === mes;
        });

        movimientosMes.forEach((movimiento) => {
          saldo +=
            movimiento.tipoMovimiento === 1
              ? movimiento.monto
              : -movimiento.monto;
        });

        etiquetas.push(this.obtenerNombreMes(mes));

        valores.push(saldo);

        cursor = new Date(anio, mes + 1, 1);
      }

      return {
        etiquetas,
        valores,
      };
    }

    const fechas = this.obtenerFechasEntre(rango.desde, rango.hasta);

    const etiquetas: string[] = [];

    const valores: number[] = [];

    fechas.forEach((fecha) => {
      movimientos
        .filter((movimiento) => movimiento.fechaMovimiento === fecha)
        .forEach((movimiento) => {
          saldo +=
            movimiento.tipoMovimiento === 1
              ? movimiento.monto
              : -movimiento.monto;
        });

      etiquetas.push(this.formatearFechaCorta(fecha));

      valores.push(saldo);
    });

    return {
      etiquetas,
      valores,
    };
  }

  private calcularDistribucionEgresos(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): DistribucionEgreso[] {
    const rango = this.obtenerRango(periodo);

    const egresos = movimientos.filter(
      (movimiento) =>
        movimiento.tipoMovimiento === 2 &&
        this.estaEnRango(movimiento.fechaMovimiento, rango.desde, rango.hasta),
    );

    const total = egresos.reduce(
      (acumulado, movimiento) => acumulado + movimiento.monto,
      0,
    );

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
  }

  private calcularFlujoCaja(
    movimientos: Movimiento[],
    periodo: PeriodoDashboard,
  ): FlujoCajaDiario[] {
    const rango = this.obtenerRango(periodo);

    let saldo = movimientos
      .filter((movimiento) => movimiento.fechaMovimiento < rango.desde)
      .reduce(
        (total, movimiento) =>
          movimiento.tipoMovimiento === 1
            ? total + movimiento.monto
            : total - movimiento.monto,
        0,
      );

    const filas = movimientos
      .filter((movimiento) =>
        this.estaEnRango(movimiento.fechaMovimiento, rango.desde, rango.hasta),
      )
      .sort((a, b) => {
        const fecha = a.fechaMovimiento.localeCompare(b.fechaMovimiento);

        if (fecha !== 0) {
          return fecha;
        }

        return a.id - b.id;
      })
      .map((movimiento) => {
        if (movimiento.tipoMovimiento === 1) {
          saldo += movimiento.monto;
        } else {
          saldo -= movimiento.monto;
        }

        return {
          fecha: this.formatearFecha(movimiento.fechaMovimiento),

          concepto: movimiento.descripcion,

          ingreso: movimiento.tipoMovimiento === 1 ? movimiento.monto : 0,

          egreso: movimiento.tipoMovimiento === 2 ? movimiento.monto : 0,

          saldo,
        };
      });

    return filas.slice(-5);
  }

  private obtenerRango(periodo: PeriodoDashboard): {
    desde: string;
    hasta: string;
  } {
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    switch (periodo) {
      case 'hoy':
        return {
          desde: this.fechaATexto(hoy),

          hasta: this.fechaATexto(hoy),
        };

      case 'semana': {
        const inicio = new Date(hoy);

        const dia = inicio.getDay();

        const diferencia = dia === 0 ? -6 : 1 - dia;

        inicio.setDate(inicio.getDate() + diferencia);

        return {
          desde: this.fechaATexto(inicio),

          hasta: this.fechaATexto(hoy),
        };
      }

      case 'mes-anterior': {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

        return {
          desde: this.fechaATexto(inicio),

          hasta: this.fechaATexto(fin),
        };
      }

      case 'anio':
        return {
          desde: `${hoy.getFullYear()}-01-01`,

          hasta: this.fechaATexto(hoy),
        };

      case 'personalizado':
      case 'mes-actual':
      default: {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        return {
          desde: this.fechaATexto(inicio),

          hasta: this.fechaATexto(hoy),
        };
      }
    }
  }

  private obtenerPeriodoAnterior(
    desde: string,
    hasta: string,
  ): {
    desde: string;
    hasta: string;
  } {
    const fechaDesde = this.fechaDesdeTexto(desde);

    const fechaHasta = this.fechaDesdeTexto(hasta);

    const dias =
      Math.floor((fechaHasta.getTime() - fechaDesde.getTime()) / 86400000) + 1;

    const finAnterior = new Date(fechaDesde);

    finAnterior.setDate(finAnterior.getDate() - 1);

    const inicioAnterior = new Date(finAnterior);

    inicioAnterior.setDate(inicioAnterior.getDate() - dias + 1);

    return {
      desde: this.fechaATexto(inicioAnterior),

      hasta: this.fechaATexto(finAnterior),
    };
  }

  private estaEnRango(fecha: string, desde: string, hasta: string): boolean {
    return fecha >= desde && fecha <= hasta;
  }

  private sumarPorTipo(
    movimientos: Movimiento[],
    tipoMovimiento: number,
  ): number {
    return movimientos
      .filter((movimiento) => movimiento.tipoMovimiento === tipoMovimiento)
      .reduce((total, movimiento) => total + movimiento.monto, 0);
  }

  private filtrarMovimientosQueAfectanCaja(
    movimientos: Movimiento[],
  ): Movimiento[] {
    return movimientos.filter(
      (movimiento) =>
        movimiento.tipoMovimiento !== 2 || movimiento.bCancelado !== 0,
    );
  }

  private calcularVariacion(actual: number, anterior: number): number {
    if (anterior === 0) {
      return actual === 0 ? 0 : 100;
    }

    return Number(
      (((actual - anterior) / Math.abs(anterior)) * 100).toFixed(1),
    );
  }

  private obtenerFechasEntre(desde: string, hasta: string): string[] {
    const resultado: string[] = [];

    const cursor = this.fechaDesdeTexto(desde);

    const fin = this.fechaDesdeTexto(hasta);

    while (cursor <= fin) {
      resultado.push(this.fechaATexto(cursor));

      cursor.setDate(cursor.getDate() + 1);
    }

    return resultado;
  }

  private fechaDesdeTexto(fecha: string): Date {
    const [anio, mes, dia] = fecha.split('-').map(Number);

    return new Date(anio, mes - 1, dia);
  }

  private fechaATexto(fecha: Date): string {
    const anio = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, '0');

    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');

    return `${dia}/${mes}/${anio}`;
  }

  private formatearFechaCorta(fecha: string): string {
    const [, mes, dia] = fecha.split('-');

    return `${dia}/${mes}`;
  }

  private obtenerNombreMes(mes: number): string {
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    return meses[mes] ?? '';
  }
}
