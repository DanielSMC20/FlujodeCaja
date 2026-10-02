import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  map,
  switchMap,
  take,
} from 'rxjs';
import { ChartNoAxesCombined, LucideAngularModule } from 'lucide-angular';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import { CategoriaMovimiento } from '../../../../nucleo/modelos/categoria-movimiento';
import { ResultadoFlujoCaja } from '../../../../nucleo/modelos/flujo-caja.model';
import { Movimiento } from '../../../../nucleo/modelos/movimiento';
import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';
import { ConfiguracionFinancieraService } from '../../../../nucleo/servicios/configuracion-financiera.service';
import { FlujoCajaService } from '../../../../nucleo/servicios/flujo-caja.service';
import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';

interface FiltroFlujoCaja {
  fechaDesde?: string;
  fechaHasta?: string;
}

type TipoColumnaMatriz = 'dia' | 'mes' | 'anio';
type TipoFilaMatriz =
  | 'saldo-inicial'
  | 'seccion-ingreso'
  | 'detalle'
  | 'subtotal'
  | 'seccion-egreso'
  | 'total'
  | 'saldo-final'
  | 'saldo-operativo';

type GrupoCategoriaEgreso = 'corriente' | 'no-corriente' | 'financiero';
type AgregacionMatriz = 'suma' | 'primero' | 'ultimo';

interface ColumnaMatriz {
  id: string;
  etiqueta: string;
  tipo: TipoColumnaMatriz;
  fechas: string[];
}

interface FilaMatriz {
  id: string;
  concepto: string;
  tipo: TipoFilaMatriz;
  valores: Record<string, number>;
}

interface CategoriaMatriz {
  id: string;
  nombre: string;
  grupo: GrupoCategoriaEgreso;
}

interface VistaFlujoCaja {
  flujoCaja: ResultadoFlujoCaja;
  columnas: ColumnaMatriz[];
  filasMatriz: FilaMatriz[];
}

@Component({
  selector: 'app-flujo-caja',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MonedaSolPipe,
    LucideAngularModule,
  ],
  templateUrl: './flujo-caja.component.html',
  styleUrl: './flujo-caja.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlujoCajaComponent {
  readonly ChartNoAxesCombined = ChartNoAxesCombined;

  private readonly flujoCajaService = inject(FlujoCajaService);
  private readonly movimientoService = inject(MovimientoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly configuracionService = inject(
    ConfiguracionFinancieraService,
  );
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  private readonly fechasIniciales = this.obtenerFechasIniciales();

  private readonly mesesCortos = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];

  private readonly mesesLargos = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];

  private readonly ordenCategoriasReferencia = [
    'PROVEEDOR',
    'ALQUILER',
    'LUMINARIA',
    'MANTENIMIENTO',
    'PROYECTO',
    'MARKETIN',
    'MARKETING',
    'MOVILIDAD',
    'SONIDO',
    'UTILES',
    'OTROS',
    'PERSONAL',
    'ALIMENTACION',
    'ANFITRIONAS',
    'ANIMADOR',
    'BARMAN',
    'DJ',
    'LIMPIEZA',
    'MOZOS',
    'SEGURIDAD',
    'LUZ',
    'AGUA',
    'TELEFONIA',
    'IMPUESTOS',
    'LICENCIAS',
  ];

  fechaApertura = '';
  errorFiltro = '';
  cargandoFlujo = false;

  readonly formulario = this.formBuilder.nonNullable.group({
    fechaDesde: [this.fechasIniciales.fechaDesde],
    fechaHasta: [this.fechasIniciales.fechaHasta],
  });

  private readonly filtroSubject = new BehaviorSubject<FiltroFlujoCaja>({
    fechaDesde: this.fechasIniciales.fechaDesde,
    fechaHasta: this.fechasIniciales.fechaHasta,
  });

  readonly vistaFlujo$ = this.filtroSubject.pipe(
    switchMap((filtro) => {
      this.cargandoFlujo = true;
      this.changeDetectorRef.markForCheck();

      return forkJoin({
        flujoCaja: this.flujoCajaService.obtenerFlujoCaja(
          filtro.fechaDesde,
          filtro.fechaHasta,
        ),
        movimientos: this.movimientoService.listarMovimientos().pipe(take(1)),
        categoriasEgreso: this.categoriaService
          .listarCategoriasPorTipo(2)
          .pipe(take(1)),
      }).pipe(
        map(({ flujoCaja, movimientos, categoriasEgreso }) =>
          this.construirVistaMatriz(flujoCaja, movimientos, categoriasEgreso),
        ),
        catchError((error) => {
          void import('sweetalert2').then(({ default: Swal }) =>
            Swal.fire({
              icon: 'error',
              title: 'No se pudo cargar el flujo de caja',
              text:
                error instanceof Error
                  ? error.message
                  : 'Ocurrió un error al consultar el flujo de caja.',
              confirmButtonText: 'Aceptar',
              heightAuto: false,
            }),
          );

          return EMPTY;
        }),
        finalize(() => {
          this.cargandoFlujo = false;
          this.changeDetectorRef.markForCheck();
        }),
      );
    }),
  );

  constructor() {
    this.configuracionService
      .obtenerConfiguracion()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (configuracion) => {
          this.fechaApertura = configuracion?.fechaSaldoInicial ?? '';

          if (
            this.fechaApertura &&
            this.formulario.controls.fechaDesde.value < this.fechaApertura
          ) {
            this.formulario.controls.fechaDesde.setValue(this.fechaApertura);
            this.aplicarFiltros();
          }

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();

    this.errorFiltro = '';

    if (
      datos.fechaDesde &&
      datos.fechaHasta &&
      datos.fechaDesde > datos.fechaHasta
    ) {
      this.errorFiltro =
        'La fecha inicial no puede ser mayor a la fecha final.';
      return;
    }

    if (
      this.fechaApertura &&
      datos.fechaDesde &&
      datos.fechaDesde < this.fechaApertura
    ) {
      this.errorFiltro =
        'El periodo no puede comenzar antes de la fecha de apertura.';
      return;
    }

    this.filtroSubject.next({
      fechaDesde: datos.fechaDesde || undefined,
      fechaHasta: datos.fechaHasta || undefined,
    });
  }

  limpiarFiltros(): void {
    this.formulario.setValue({
      fechaDesde: '',
      fechaHasta: '',
    });

    this.filtroSubject.next({});
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');

    if (!anio || !mes || !dia) {
      return fecha;
    }

    return `${dia}/${mes}/${anio}`;
  }

  formatearMontoMatriz(valor: number | null | undefined): string {
    const monto = Number(valor ?? 0);

    if (Math.abs(monto) < 0.005) {
      return '-';
    }

    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  }

  private construirVistaMatriz(
    flujoCaja: ResultadoFlujoCaja,
    movimientos: Movimiento[],
    categoriasEgreso: CategoriaMovimiento[],
  ): VistaFlujoCaja {
    const fechas = this.construirFechasPeriodo(flujoCaja);
    const columnas = this.construirColumnas(fechas);
    const filasMatriz = this.construirFilasMatriz(
      flujoCaja,
      movimientos,
      categoriasEgreso,
      fechas,
      columnas,
    );

    return {
      flujoCaja,
      columnas,
      filasMatriz,
    };
  }

  private construirFechasPeriodo(flujoCaja: ResultadoFlujoCaja): string[] {
    const desde = flujoCaja.resumen.fechaDesde;
    const hasta = flujoCaja.resumen.fechaHasta;

    if (!desde || !hasta) {
      return [...new Set(flujoCaja.filas.map((fila) => fila.fecha))].sort();
    }

    const fechaInicio = this.parsearFechaIso(desde);
    const fechaFin = this.parsearFechaIso(hasta);

    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
      return [...new Set(flujoCaja.filas.map((fila) => fila.fecha))].sort();
    }

    const fechas: string[] = [];
    const cursor = new Date(fechaInicio.getTime());

    while (cursor <= fechaFin) {
      fechas.push(this.fechaAIso(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return fechas;
  }

  private construirColumnas(fechas: string[]): ColumnaMatriz[] {
    const columnas: ColumnaMatriz[] = [];
    const fechasPorMes = new Map<string, string[]>();
    const fechasPorAnio = new Map<string, string[]>();

    for (const fecha of fechas) {
      const [anio, mes] = fecha.split('-');
      const claveMes = `${anio}-${mes}`;

      fechasPorMes.set(claveMes, [
        ...(fechasPorMes.get(claveMes) ?? []),
        fecha,
      ]);
      fechasPorAnio.set(anio, [...(fechasPorAnio.get(anio) ?? []), fecha]);
    }

    fechas.forEach((fecha, indice) => {
      const [anio, mes, dia] = fecha.split('-');
      const numeroMes = Number(mes);
      const claveMes = `${anio}-${mes}`;
      const siguiente = fechas[indice + 1];
      const siguienteMes = siguiente?.slice(0, 7);

      columnas.push({
        id: `dia_${fecha}`,
        etiqueta: `${dia}-${this.mesesCortos[numeroMes - 1] ?? mes}`,
        tipo: 'dia',
        fechas: [fecha],
      });

      if (!siguiente || siguienteMes !== claveMes) {
        columnas.push({
          id: `mes_${claveMes}`,
          etiqueta: this.mesesLargos[numeroMes - 1] ?? claveMes,
          tipo: 'mes',
          fechas: fechasPorMes.get(claveMes) ?? [fecha],
        });

        const cambiaAnio = siguiente ? siguiente.slice(0, 4) !== anio : false;
        const terminaDiciembre = numeroMes === 12;

        if (cambiaAnio || terminaDiciembre) {
          columnas.push({
            id: `anio_${anio}`,
            etiqueta: anio,
            tipo: 'anio',
            fechas: fechasPorAnio.get(anio) ?? [fecha],
          });
        }
      }
    });

    return columnas;
  }

  private construirFilasMatriz(
    flujoCaja: ResultadoFlujoCaja,
    movimientos: Movimiento[],
    categoriasEgreso: CategoriaMovimiento[],
    fechas: string[],
    columnas: ColumnaMatriz[],
  ): FilaMatriz[] {
    const fechasPermitidas = new Set(fechas);

    const ingresoEfectivo = this.crearSerie(fechas);
    const ingresoPos = this.crearSerie(fechas);
    const ingresoVentaActivo = this.crearSerie(fechas);
    const ingresoPrestamos = this.crearSerie(fechas);
    const ingresoIntereses = this.crearSerie(fechas);
    const egresosPorCategoria = new Map<string, Map<string, number>>();

    for (const movimiento of movimientos) {
      const fecha = this.obtenerFechaEfectivaMovimiento(movimiento);

      if (!fecha || !fechasPermitidas.has(fecha)) {
        continue;
      }

      const monto = Number(movimiento.monto ?? 0);

      if (!Number.isFinite(monto) || monto === 0) {
        continue;
      }

      if (movimiento.tipoMovimiento === 1) {
        const categoria = this.normalizarTexto(movimiento.categoria);

        if (
          categoria === 'VENTA DE ACTIVO' ||
          categoria === 'VENTA DE ACTIVOS'
        ) {
          this.acumularSerie(ingresoVentaActivo, fecha, monto);
          continue;
        }

        if (categoria === 'PRESTAMO' || categoria === 'PRESTAMOS') {
          this.acumularSerie(ingresoPrestamos, fecha, monto);
          continue;
        }

        if (
          categoria === 'INTERES GANADO' ||
          categoria === 'INTERESES GANADOS'
        ) {
          this.acumularSerie(ingresoIntereses, fecha, monto);
          continue;
        }

        if (movimiento.medioPago === 2) {
          this.acumularSerie(ingresoPos, fecha, monto);
        } else {
          this.acumularSerie(ingresoEfectivo, fecha, monto);
        }

        continue;
      }

      if (movimiento.tipoMovimiento === 2) {
        const claveCategoria =
          this.normalizarTexto(movimiento.categoria) || 'SIN CLASIFICADOR';
        const serie =
          egresosPorCategoria.get(claveCategoria) ?? this.crearSerie(fechas);

        this.acumularSerie(serie, fecha, monto);
        egresosPorCategoria.set(claveCategoria, serie);
      }
    }

    const totalIngresosCorrientes = this.sumarSeries(
      fechas,
      ingresoEfectivo,
      ingresoPos,
    );
    const totalIngresosNoCorrientes = this.sumarSeries(
      fechas,
      ingresoVentaActivo,
    );
    const totalIngresosFinancieros = this.sumarSeries(
      fechas,
      ingresoPrestamos,
      ingresoIntereses,
    );
    const totalIngresos = this.sumarSeries(
      fechas,
      totalIngresosCorrientes,
      totalIngresosNoCorrientes,
      totalIngresosFinancieros,
    );

    const categoriasMatriz = this.obtenerCategoriasMatriz(
      categoriasEgreso,
      movimientos,
    );

    const categoriasCorrientes = categoriasMatriz.filter(
      (categoria) => categoria.grupo === 'corriente',
    );
    const categoriasNoCorrientes = categoriasMatriz.filter(
      (categoria) => categoria.grupo === 'no-corriente',
    );
    const categoriasFinancieras = categoriasMatriz.filter(
      (categoria) => categoria.grupo === 'financiero',
    );

    const serieCategoria = (categoria: CategoriaMatriz): Map<string, number> =>
      egresosPorCategoria.get(categoria.id) ?? this.crearSerie(fechas);

    const totalEgresosCorrientes = this.sumarSeries(
      fechas,
      ...categoriasCorrientes.map(serieCategoria),
    );
    const totalEgresosNoCorrientes = this.sumarSeries(
      fechas,
      ...categoriasNoCorrientes.map(serieCategoria),
    );
    const totalEgresosFinancieros = this.sumarSeries(
      fechas,
      ...categoriasFinancieras.map(serieCategoria),
    );
    const totalEgresos = this.sumarSeries(
      fechas,
      totalEgresosCorrientes,
      totalEgresosNoCorrientes,
      totalEgresosFinancieros,
    );
    const saldoOperativo = this.restarSeries(
      fechas,
      totalIngresos,
      totalEgresos,
    );

    const saldoInicialDia = this.crearSerie(fechas);
    const saldoFinalDia = this.crearSerie(fechas);

    let saldoAcumulado = Number(
      flujoCaja.resumen.saldoInicialProyectado ??
        flujoCaja.resumen.saldoInicialReal ??
        0,
    );

    for (const fecha of fechas) {
      saldoInicialDia.set(fecha, saldoAcumulado);
      saldoAcumulado += saldoOperativo.get(fecha) ?? 0;
      saldoFinalDia.set(fecha, saldoAcumulado);
    }

    const filas: FilaMatriz[] = [
      this.crearFila(
        'saldo-inicial',
        'SALDO INICIAL',
        'saldo-inicial',
        columnas,
        saldoInicialDia,
        'primero',
      ),
      this.crearFilaSeccion(
        'ingresos-corrientes',
        'INGRESOS CORRIENTES',
        'seccion-ingreso',
        columnas,
      ),
      this.crearFila(
        'ingreso-efectivo',
        'EFECTIVO',
        'detalle',
        columnas,
        ingresoEfectivo,
      ),
      this.crearFila('ingreso-pos', 'POS', 'detalle', columnas, ingresoPos),
      this.crearFila(
        'total-ingresos-corrientes',
        'TOTAL INGRESOS CORRIENTES',
        'subtotal',
        columnas,
        totalIngresosCorrientes,
      ),
      this.crearFilaSeccion(
        'ingresos-no-corrientes',
        'INGRESOS NO CORRIENTE',
        'seccion-ingreso',
        columnas,
      ),
      this.crearFila(
        'venta-activo',
        'VENTA DE ACTIVO',
        'detalle',
        columnas,
        ingresoVentaActivo,
      ),
      this.crearFila(
        'total-ingresos-no-corrientes',
        'TOTAL INGRESOS NO CORRIENTES',
        'subtotal',
        columnas,
        totalIngresosNoCorrientes,
      ),
      this.crearFilaSeccion(
        'ingresos-financieros',
        'INGRESOS FINANCIEROS',
        'seccion-ingreso',
        columnas,
      ),
      this.crearFila(
        'ingreso-prestamos',
        'PRESTAMOS',
        'detalle',
        columnas,
        ingresoPrestamos,
      ),
      this.crearFila(
        'intereses-ganados',
        'INTERESES GANADOS',
        'detalle',
        columnas,
        ingresoIntereses,
      ),
      this.crearFila(
        'total-ingresos-financieros',
        'TOTAL DE INGRESO FINANCIEROS',
        'subtotal',
        columnas,
        totalIngresosFinancieros,
      ),
      this.crearFila(
        'total-ingresos',
        'TOTAL INGRESOS',
        'total',
        columnas,
        totalIngresos,
      ),
      this.crearFilaSeccion(
        'egresos-corrientes',
        'EGRESOS CORRIENTES',
        'seccion-egreso',
        columnas,
      ),
      ...categoriasCorrientes.map((categoria) =>
        this.crearFila(
          `egreso-corriente-${categoria.id}`,
          categoria.nombre,
          'detalle',
          columnas,
          serieCategoria(categoria),
        ),
      ),
      this.crearFila(
        'total-egresos-corrientes',
        'TOTAL DE GASTOS CORRIENTES',
        'subtotal',
        columnas,
        totalEgresosCorrientes,
      ),
      this.crearFilaSeccion(
        'egresos-no-corrientes',
        'EGRESOS NO CORRIENTES',
        'seccion-egreso',
        columnas,
      ),
      ...this.crearFilasEgresoConReserva(
        categoriasNoCorrientes,
        'ACTIVO',
        'egreso-no-corriente',
        columnas,
        egresosPorCategoria,
        fechas,
      ),
      this.crearFila(
        'total-egresos-no-corrientes',
        'TOTAL DE EGRESOS NO CORRIENTES',
        'subtotal',
        columnas,
        totalEgresosNoCorrientes,
      ),
      this.crearFilaSeccion(
        'egresos-financieros',
        'EGRESOS FINANCIEROS',
        'seccion-egreso',
        columnas,
      ),
      ...this.crearFilasEgresoConReserva(
        categoriasFinancieras,
        'PRESTAMOS',
        'egreso-financiero',
        columnas,
        egresosPorCategoria,
        fechas,
      ),
      this.crearFila(
        'total-egresos-financieros',
        'TOTAL DE EGRESOS FINANCIEROS',
        'subtotal',
        columnas,
        totalEgresosFinancieros,
      ),
      this.crearFila(
        'total-egresos',
        'TOTAL EGRESOS',
        'total',
        columnas,
        totalEgresos,
      ),
      this.crearFila(
        'saldo-final',
        'SALDO FINAL',
        'saldo-final',
        columnas,
        saldoFinalDia,
        'ultimo',
      ),
      this.crearFila(
        'saldo-operativo',
        'SALDO OPERATIVO',
        'saldo-operativo',
        columnas,
        saldoOperativo,
      ),
    ];

    return filas;
  }

  private crearFilasEgresoConReserva(
    categorias: CategoriaMatriz[],
    etiquetaReserva: string,
    prefijo: string,
    columnas: ColumnaMatriz[],
    egresosPorCategoria: Map<string, Map<string, number>>,
    fechas: string[],
  ): FilaMatriz[] {
    if (categorias.length === 0) {
      return [
        this.crearFila(
          `${prefijo}-reserva`,
          etiquetaReserva,
          'detalle',
          columnas,
          this.crearSerie(fechas),
        ),
      ];
    }

    return categorias.map((categoria) =>
      this.crearFila(
        `${prefijo}-${categoria.id}`,
        categoria.nombre,
        'detalle',
        columnas,
        egresosPorCategoria.get(categoria.id) ?? this.crearSerie(fechas),
      ),
    );
  }

  private obtenerCategoriasMatriz(
    categoriasEgreso: CategoriaMovimiento[],
    movimientos: Movimiento[],
  ): CategoriaMatriz[] {
    const categorias = new Map<string, CategoriaMatriz>();

    for (const categoria of categoriasEgreso) {
      const id = this.normalizarTexto(categoria.nombre);

      if (!id) {
        continue;
      }

      categorias.set(id, {
        id,
        nombre: categoria.nombre.trim().toUpperCase(),
        grupo: this.clasificarCategoriaEgreso(id),
      });
    }

    for (const movimiento of movimientos) {
      if (movimiento.tipoMovimiento !== 2) {
        continue;
      }

      const id = this.normalizarTexto(movimiento.categoria);

      if (!id || categorias.has(id)) {
        continue;
      }

      categorias.set(id, {
        id,
        nombre: movimiento.categoria.trim().toUpperCase(),
        grupo: this.clasificarCategoriaEgreso(id),
      });
    }

    return [...categorias.values()].sort((a, b) => {
      if (a.grupo !== b.grupo) {
        const ordenGrupo: Record<GrupoCategoriaEgreso, number> = {
          corriente: 1,
          'no-corriente': 2,
          financiero: 3,
        };

        return ordenGrupo[a.grupo] - ordenGrupo[b.grupo];
      }

      const posicionA = this.ordenCategoriasReferencia.indexOf(a.id);
      const posicionB = this.ordenCategoriasReferencia.indexOf(b.id);
      const ordenA = posicionA === -1 ? Number.MAX_SAFE_INTEGER : posicionA;
      const ordenB = posicionB === -1 ? Number.MAX_SAFE_INTEGER : posicionB;

      return ordenA !== ordenB
        ? ordenA - ordenB
        : a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  private clasificarCategoriaEgreso(
    categoriaNormalizada: string,
  ): GrupoCategoriaEgreso {
    if (
      categoriaNormalizada === 'ACTIVO' ||
      categoriaNormalizada === 'ACTIVOS' ||
      categoriaNormalizada === 'COMPRA DE ACTIVO' ||
      categoriaNormalizada === 'COMPRA DE ACTIVOS'
    ) {
      return 'no-corriente';
    }

    if (
      categoriaNormalizada === 'PRESTAMO' ||
      categoriaNormalizada === 'PRESTAMOS'
    ) {
      return 'financiero';
    }

    return 'corriente';
  }

  private obtenerFechaEfectivaMovimiento(movimiento: Movimiento): string {
    if (movimiento.tipoMovimiento === 1) {
      return movimiento.fechaMovimiento;
    }

    if (movimiento.tipoMovimiento === 2) {
      return movimiento.bCancelado === 0
        ? (movimiento.fechaProyectada ?? movimiento.fechaMovimiento)
        : (movimiento.fechaPago ?? movimiento.fechaMovimiento);
    }

    return movimiento.fechaMovimiento;
  }

  private crearFila(
    id: string,
    concepto: string,
    tipo: TipoFilaMatriz,
    columnas: ColumnaMatriz[],
    serie: Map<string, number>,
    agregacion: AgregacionMatriz = 'suma',
  ): FilaMatriz {
    return {
      id,
      concepto,
      tipo,
      valores: this.proyectarSerieEnColumnas(columnas, serie, agregacion),
    };
  }

  private crearFilaSeccion(
    id: string,
    concepto: string,
    tipo: 'seccion-ingreso' | 'seccion-egreso',
    columnas: ColumnaMatriz[],
  ): FilaMatriz {
    return {
      id,
      concepto,
      tipo,
      valores: Object.fromEntries(columnas.map((columna) => [columna.id, 0])),
    };
  }

  private proyectarSerieEnColumnas(
    columnas: ColumnaMatriz[],
    serie: Map<string, number>,
    agregacion: AgregacionMatriz,
  ): Record<string, number> {
    const valores: Record<string, number> = {};

    for (const columna of columnas) {
      const fechas = columna.fechas;

      if (fechas.length === 0) {
        valores[columna.id] = 0;
        continue;
      }

      if (agregacion === 'primero') {
        valores[columna.id] = serie.get(fechas[0]) ?? 0;
        continue;
      }

      if (agregacion === 'ultimo') {
        valores[columna.id] = serie.get(fechas[fechas.length - 1]) ?? 0;
        continue;
      }

      valores[columna.id] = fechas.reduce(
        (total, fecha) => total + (serie.get(fecha) ?? 0),
        0,
      );
    }

    return valores;
  }

  private crearSerie(fechas: string[]): Map<string, number> {
    return new Map(fechas.map((fecha) => [fecha, 0]));
  }

  private acumularSerie(
    serie: Map<string, number>,
    fecha: string,
    monto: number,
  ): void {
    serie.set(fecha, (serie.get(fecha) ?? 0) + monto);
  }

  private sumarSeries(
    fechas: string[],
    ...series: Array<Map<string, number>>
  ): Map<string, number> {
    const total = this.crearSerie(fechas);

    for (const fecha of fechas) {
      total.set(
        fecha,
        series.reduce((suma, serie) => suma + (serie.get(fecha) ?? 0), 0),
      );
    }

    return total;
  }

  private restarSeries(
    fechas: string[],
    minuendo: Map<string, number>,
    sustraendo: Map<string, number>,
  ): Map<string, number> {
    const resultado = this.crearSerie(fechas);

    for (const fecha of fechas) {
      resultado.set(
        fecha,
        (minuendo.get(fecha) ?? 0) - (sustraendo.get(fecha) ?? 0),
      );
    }

    return resultado;
  }

  private normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private parsearFechaIso(fecha: string): Date | null {
    const [anio, mes, dia] = fecha.split('-').map(Number);

    if (!anio || !mes || !dia) {
      return null;
    }

    return new Date(Date.UTC(anio, mes - 1, dia));
  }

  private fechaAIso(fecha: Date): string {
    const anio = fecha.getUTCFullYear();
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getUTCDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private obtenerFechasIniciales(): {
    fechaDesde: string;
    fechaHasta: string;
  } {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');

    return {
      fechaDesde: `${anio}-${mes}-01`,
      fechaHasta: `${anio}-${mes}-${dia}`,
    };
  }
}
