import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';
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
import { ChartNoAxesCombined, Download, LucideAngularModule } from 'lucide-angular';
import * as XLSX from 'xlsx-js-style';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';
import { CategoriaMovimiento } from '../../../../nucleo/modelos/categoria-movimiento';
import { ResultadoFlujoCaja } from '../../../../nucleo/modelos/flujo-caja.model';
import { Movimiento } from '../../../../nucleo/modelos/movimiento';
import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';
import { ConfiguracionFinancieraService } from '../../../../nucleo/servicios/configuracion-financiera.service';
import { FlujoCajaService } from '../../../../nucleo/servicios/flujo-caja.service';
import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';

type AgrupacionFlujo = 'dia' | 'semana' | 'mes' | 'anio';

interface FiltroFlujoCaja {
  agrupacion: AgrupacionFlujo;
  mes: number;
  anio: number;
}

interface RangoFlujo {
  fechaDesde: string;
  fechaHasta: string;
}

type TipoColumnaMatriz = AgrupacionFlujo;
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

  detalleEgresos?: Record<string, DetalleEgresoCelda>;
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
  filtro: FiltroFlujoCaja;
  rango: RangoFlujo;
  saldoConfigurado: boolean;
}

interface MovimientoCeldaMatriz {
  id: number;

  monto: number;

  descripcion: string;

  fecha: string;

  estado: 'pagado' | 'proyectado';
}

interface DetalleEgresoCelda {
  pagados: MovimientoCeldaMatriz[];

  proyectados: MovimientoCeldaMatriz[];

  montoPagado: number;

  montoProyectado: number;
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
  readonly Download = Download;
  @ViewChild('cashflowTableWrap')
  private cashflowTableWrap?: ElementRef<HTMLDivElement>;
  private readonly flujoCajaService = inject(FlujoCajaService);
  private readonly movimientoService = inject(MovimientoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly configuracionService = inject(
    ConfiguracionFinancieraService,
  );
  private readonly sesionUsuarioService = inject(SesionUsuarioService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private autoScrollFrameId: number | null = null;

  private posicionXArrastre = 0;

  private direccionAutoScroll: -1 | 0 | 1 = 0;

  readonly mesesSeleccion = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  readonly aniosDisponibles = Array.from(
    { length: 8 },
    (_, indice) => new Date().getFullYear() - indice,
  );

  private readonly filtroInicial: FiltroFlujoCaja = {
    agrupacion: 'mes',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  };

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
  saldoAperturaContable = 0;
  errorFiltro = '';
  cargandoFlujo = false;

  readonly formulario = this.formBuilder.nonNullable.group({
    agrupacion: [this.filtroInicial.agrupacion],
    mes: [this.filtroInicial.mes],
    anio: [this.filtroInicial.anio],
  });

  private readonly filtroSubject = new BehaviorSubject<FiltroFlujoCaja>(
    this.filtroInicial,
  );

  /**
   * El PA_FlujoCaja_Sel admite hasta un año por consulta. Para el resumen
   * anual de tres años se consulta cada año individualmente y se combinan
   * sus resultados; no se amplía el límite del procedimiento MySQL.
   */
  readonly vistaFlujo$ = this.filtroSubject.pipe(
    switchMap((filtro) => {
      this.cargandoFlujo = true;
      this.changeDetectorRef.markForCheck();
      return this.configuracionService.obtenerConfiguracion().pipe(
        take(1),
        switchMap((configuracion) => {
          const apertura = configuracion?.fechaSaldoInicial ?? '';
          this.fechaApertura = apertura;
          this.saldoAperturaContable = Number(configuracion?.saldoInicial ?? 0);
          const rango = this.obtenerRango(filtro);
          const periodos = this.obtenerPeriodosConsulta(filtro);

          return forkJoin({
            flujoCaja: forkJoin(periodos.map((periodo) => {
              // No existe saldo ni movimientos anteriores a la apertura.
              if (apertura && periodo.fechaHasta < apertura) {
                return this.crearFlujoSinMovimientos(periodo);
              }
              return this.flujoCajaService.obtenerFlujoCaja(
                apertura && periodo.fechaDesde < apertura
                  ? apertura : periodo.fechaDesde,
                periodo.fechaHasta,
              );
            })).pipe(map((flujos) => this.combinarFlujos(flujos, rango))),
            // Se mantiene la consulta completa para incluir egresos cuya
            // fecha proyectada se reprogramó fuera de su fecha original.
            movimientos: this.movimientoService.listarMovimientos().pipe(take(1)),
            categoriasEgreso: this.categoriaService
              .listarCategoriasPorTipo(2).pipe(take(1)),
          }).pipe(
            map(({ flujoCaja, movimientos, categoriasEgreso }) =>
              this.construirVistaMatriz(
                flujoCaja, movimientos, categoriasEgreso, filtro, rango,
                Boolean(apertura),
              ),
            ),
          );
        }),
        catchError((error) => {
          void import('sweetalert2').then(({ default: Swal }) =>
            Swal.fire({
              icon: 'error',
              title: 'No se pudo cargar el flujo de caja',
              text: error instanceof Error ? error.message
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

  aplicarFiltros(): void {
    const datos = this.formulario.getRawValue();
    const agrupacion = datos.agrupacion as AgrupacionFlujo;
    this.errorFiltro = '';

    if (!['dia', 'semana', 'mes', 'anio'].includes(agrupacion)) {
      this.errorFiltro = 'Selecciona una agrupación válida.';
      return;
    }
    if (!Number.isInteger(datos.mes) || datos.mes < 1 || datos.mes > 12
      || !Number.isInteger(datos.anio) || datos.anio < 2000
      || datos.anio > new Date().getFullYear()) {
      this.errorFiltro = 'Selecciona un mes y año válidos.';
      return;
    }

    const filtro: FiltroFlujoCaja = {
      agrupacion,
      mes: datos.mes,
      anio: datos.anio,
    };
    this.filtroSubject.next(filtro);
  }

  limpiarFiltros(): void {
    this.formulario.setValue({
      agrupacion: this.filtroInicial.agrupacion,
      mes: this.filtroInicial.mes,
      anio: this.filtroInicial.anio,
    });
    this.aplicarFiltros();
  }

  private obtenerRango(filtro: FiltroFlujoCaja): RangoFlujo {
    if (filtro.agrupacion === 'anio') {
      const ultimo = new Date().getFullYear();
      return {
        fechaDesde: `${ultimo - 2}-01-01`,
        fechaHasta: `${ultimo}-12-31`,
      };
    }
    if (filtro.agrupacion === 'mes') {
      return {
        fechaDesde: `${filtro.anio}-01-01`,
        fechaHasta: `${filtro.anio}-12-31`,
      };
    }
    const mes = String(filtro.mes).padStart(2, '0');
    const ultimoDia = new Date(Date.UTC(filtro.anio, filtro.mes, 0))
      .getUTCDate();
    return {
      fechaDesde: `${filtro.anio}-${mes}-01`,
      fechaHasta: `${filtro.anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`,
    };
  }

  private obtenerPeriodosConsulta(filtro: FiltroFlujoCaja): RangoFlujo[] {
    const rango = this.obtenerRango(filtro);
    if (filtro.agrupacion !== 'anio') {
      return [rango];
    }
    const ultimo = new Date().getFullYear();
    return [ultimo - 2, ultimo - 1, ultimo].map((anio) => ({
      fechaDesde: `${anio}-01-01`,
      fechaHasta: `${anio}-12-31`,
    }));
  }

  private crearFlujoSinMovimientos(rango: RangoFlujo) {
    return new BehaviorSubject<ResultadoFlujoCaja>({
      resumen: {
        fechaDesde: rango.fechaDesde,
        fechaHasta: rango.fechaHasta,
        saldoInicialReal: 0,
        saldoInicialProyectado: 0,
        totalIngresos: 0,
        totalEgresosPagados: 0,
        totalEgresosProyectados: 0,
        saldoFinalReal: 0,
        saldoFinalProyectado: 0,
      },
      filas: [],
    }).pipe(take(1));
  }

  private combinarFlujos(
    flujos: ResultadoFlujoCaja[],
    rango: RangoFlujo,
  ): ResultadoFlujoCaja {
    const primero = flujos[0]?.resumen;
    const ultimo = flujos[flujos.length - 1]?.resumen;
    return {
      resumen: {
        fechaDesde: rango.fechaDesde,
        fechaHasta: rango.fechaHasta,
        saldoInicialReal: primero?.saldoInicialReal ?? 0,
        saldoInicialProyectado: primero?.saldoInicialProyectado ?? 0,
        totalIngresos: flujos.reduce((s, f) => s + f.resumen.totalIngresos, 0),
        totalEgresosPagados: flujos.reduce(
          (s, f) => s + f.resumen.totalEgresosPagados, 0),
        totalEgresosProyectados: flujos.reduce(
          (s, f) => s + f.resumen.totalEgresosProyectados, 0),
        saldoFinalReal: ultimo?.saldoFinalReal ?? 0,
        saldoFinalProyectado: ultimo?.saldoFinalProyectado ?? 0,
      },
      filas: flujos.flatMap((flujo) => flujo.filas),
    };
  }

  descripcionPeriodo(filtro: FiltroFlujoCaja): string {
    if (filtro.agrupacion === 'anio') {
      const anio = new Date().getFullYear();
      return `${anio - 2} – ${anio}`;
    }
    if (filtro.agrupacion === 'mes') {
      return `Enero – Diciembre ${filtro.anio}`;
    }
    return `${this.mesesSeleccion[filtro.mes - 1]} ${filtro.anio}`;
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
    filtro: FiltroFlujoCaja,
    rango: RangoFlujo,
    saldoConfigurado: boolean,
  ): VistaFlujoCaja {
    const fechas = this.construirFechasPeriodo(rango);
    const columnas = this.construirColumnas(fechas, filtro);
    const filasMatriz = this.construirFilasMatriz(
      flujoCaja, movimientos, categoriasEgreso, fechas, columnas,
    );
    return { flujoCaja, columnas, filasMatriz, filtro, rango, saldoConfigurado };
  }

  private construirFechasPeriodo(rango: RangoFlujo): string[] {
    const inicio = this.parsearFechaIso(rango.fechaDesde);
    const fin = this.parsearFechaIso(rango.fechaHasta);
    if (!inicio || !fin || inicio > fin) {
      return [];
    }
    const fechas: string[] = [];
    const cursor = new Date(inicio.getTime());
    while (cursor <= fin) {
      fechas.push(this.fechaAIso(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return fechas;
  }

  private construirColumnas(
    fechas: string[], filtro: FiltroFlujoCaja,
  ): ColumnaMatriz[] {
    const grupos = new Map<string, ColumnaMatriz>();
    for (const fecha of fechas) {
      const [anio, mes, dia] = fecha.split('-');
      const mesIndice = Number(mes) - 1;
      let id = '';
      let etiqueta = '';

      switch (filtro.agrupacion) {
        case 'dia':
          id = `dia_${fecha}`;
          etiqueta = `${dia} ${this.mesesCortos[mesIndice]}`;
          break;
        case 'semana': {
          // Lunes = 0. Una semana que atraviesa dos meses se
          // presenta únicamente con las fechas del mes consultado.
          const fechaUtc = this.parsearFechaIso(fecha)!;
          const lunes = new Date(fechaUtc.getTime());
          lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
          id = `semana_${this.fechaAIso(lunes)}`;
          etiqueta = ''; // Se asigna al completar cada grupo.
          break;
        }
        case 'mes':
          id = `mes_${anio}-${mes}`;
          etiqueta = this.mesesLargos[mesIndice];
          break;
        case 'anio':
          id = `anio_${anio}`;
          etiqueta = anio;
          break;
      }
      if (!grupos.has(id)) {
        grupos.set(id, { id, etiqueta, tipo: filtro.agrupacion, fechas: [] });
      }
      grupos.get(id)!.fechas.push(fecha);
    }
    const columnas = [...grupos.values()];
    if (filtro.agrupacion === 'semana') {
      columnas.forEach((columna, indice) => {
        const primero = columna.fechas[0];
        const ultimo = columna.fechas[columna.fechas.length - 1];
        columna.etiqueta = `SEM. ${indice + 1} (${primero.slice(8)}–${ultimo.slice(8)} ${this.mesesCortos[filtro.mes - 1]})`;
      });
    }
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

    if (this.fechaApertura && fechas[0] < this.fechaApertura) {
      // Los períodos anteriores a la apertura no heredan saldo contable.
      saldoAcumulado = 0;
    }

    for (const fecha of fechas) {
      if (this.fechaApertura && fecha === this.fechaApertura) {
        // El primer día de apertura incorpora el saldo registrado una sola vez.
        saldoAcumulado = this.saldoAperturaContable;
      }
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
    for (const fila of filas) {
      /*
       * Solamente enriquecemos las filas
       * que representan categorías de egreso.
       */
      if (fila.tipo !== 'detalle' || !fila.id.startsWith('egreso-')) {
        continue;
      }

      const categoria = this.normalizarTexto(fila.concepto);

      const movimientosCategoria = movimientos.filter(
        (movimiento) =>
          movimiento.tipoMovimiento === 2 &&
          this.normalizarTexto(movimiento.categoria) === categoria,
      );

      fila.detalleEgresos = this.crearDetalleEgresoPorColumnas(
        columnas,
        movimientosCategoria,
      );
    }
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

  private crearDetalleEgresoPorColumnas(
    columnas: ColumnaMatriz[],
    movimientos: Movimiento[],
  ): Record<string, DetalleEgresoCelda> {
    const resultado: Record<string, DetalleEgresoCelda> = {};

    for (const columna of columnas) {
      const fechasColumna = new Set(columna.fechas);

      const pagados: MovimientoCeldaMatriz[] = [];

      const proyectados: MovimientoCeldaMatriz[] = [];

      for (const movimiento of movimientos) {
        const fecha = this.obtenerFechaEfectivaMovimiento(movimiento);

        if (!fecha || !fechasColumna.has(fecha)) {
          continue;
        }

        const item: MovimientoCeldaMatriz = {
          id: movimiento.id,

          monto: Number(movimiento.monto ?? 0),

          descripcion: movimiento.descripcion,

          fecha,

          estado: movimiento.bCancelado === 0 ? 'proyectado' : 'pagado',
        };

        if (movimiento.bCancelado === 0) {
          proyectados.push(item);
        } else {
          pagados.push(item);
        }
      }

      resultado[columna.id] = {
        pagados,

        proyectados,

        montoPagado: pagados.reduce((total, item) => total + item.monto, 0),

        montoProyectado: proyectados.reduce(
          (total, item) => total + item.monto,
          0,
        ),
      };
    }

    return resultado;
  }

  private movimientoArrastrado: MovimientoCeldaMatriz | null = null;

  private filaArrastradaId: string | null = null;

  celdaDestinoArrastre: string | null = null;

  reprogramandoEgreso = false;

  iniciarArrastreProyectado(
    event: DragEvent,
    movimiento: MovimientoCeldaMatriz,
    filaId: string,
  ): void {
    if (
      !this.puedeGestionarMovimientos ||
      movimiento.estado !== 'proyectado' ||
      this.reprogramandoEgreso
    ) {
      event.preventDefault();
      return;
    }

    this.movimientoArrastrado = movimiento;
    this.filaArrastradaId = filaId;

    this.detenerAutoScroll();

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(movimiento.id));
    }
  }

permitirSoltarProyectado(
  event: DragEvent,
  columna: ColumnaMatriz,
  filaId: string,
): void {
  if (
    !this.puedeGestionarMovimientos ||
    !this.movimientoArrastrado ||
    columna.tipo !== 'dia' ||
    filaId !== this.filaArrastradaId
  ) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  this.celdaDestinoArrastre = `${filaId}_${columna.id}`;
}
  salirDestinoArrastre(filaId: string, columnaId: string): void {
    const clave = `${filaId}_${columnaId}`;

    if (this.celdaDestinoArrastre === clave) {
      this.celdaDestinoArrastre = null;
    }
  }
async soltarProyectado(
  event: DragEvent,
  columna: ColumnaMatriz,
  filaId: string,
): Promise<void> {
  event.preventDefault();

  if (!this.puedeGestionarMovimientos) {
    this.finalizarArrastre();
    return;
  }

  const movimiento = this.movimientoArrastrado;

    this.celdaDestinoArrastre = null;

    if (
      !movimiento ||
      columna.tipo !== 'dia' ||
      filaId !== this.filaArrastradaId
    ) {
      this.finalizarArrastre();
      return;
    }

    const fechaDestino = columna.fechas[0];

    if (!fechaDestino || fechaDestino === movimiento.fecha) {
      this.finalizarArrastre();
      return;
    }

    const { default: Swal } = await import('sweetalert2');

    const confirmacion = await Swal.fire({
      icon: 'question',

      title: 'Reprogramar egreso',

      html: `
        <div style="text-align:left">
          <p>
            Se cambiará la fecha proyectada:
          </p>

          <p>
            <strong>
              ${this.formatearFecha(movimiento.fecha)}
            </strong>
            →
            <strong>
              ${this.formatearFecha(fechaDestino)}
            </strong>
          </p>

          <p>
            Monto:
            <strong>
              S/ ${movimiento.monto.toFixed(2)}
            </strong>
          </p>
        </div>
      `,

      showCancelButton: true,

      confirmButtonText: 'Reprogramar',

      cancelButtonText: 'Cancelar',

      heightAuto: false,
    });

    if (!confirmacion.isConfirmed) {
      this.finalizarArrastre();
      return;
    }

    this.reprogramandoEgreso = true;

    this.movimientoService
      .reprogramarFechaProyectada(movimiento.id, fechaDestino)
      .pipe(
        finalize(() => {
          this.reprogramandoEgreso = false;

          this.finalizarArrastre();

          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void Swal.fire({
            icon: 'success',

            title: 'Fecha actualizada',

            text: 'El egreso proyectado fue reprogramado.',

            timer: 1500,

            showConfirmButton: false,

            heightAuto: false,
          });

          /*
           * Volvemos a consultar flujo,
           * movimientos y saldos.
           */
          this.aplicarFiltros();
        },

        error: (error) => {
          void Swal.fire({
            icon: 'error',

            title: 'No se pudo reprogramar',

            text:
              error instanceof Error
                ? error.message
                : 'Ocurrió un error al actualizar la fecha.',

            confirmButtonText: 'Aceptar',

            heightAuto: false,
          });
        },
      });
  }
  finalizarArrastre(): void {
    this.detenerAutoScroll();

    this.movimientoArrastrado = null;

    this.filaArrastradaId = null;

    this.celdaDestinoArrastre = null;
  }
  esDestinoArrastre(filaId: string, columnaId: string): boolean {
    return this.celdaDestinoArrastre === `${filaId}_${columnaId}`;
  }

  arrastrandoMatriz = false;

  private pointerMatrizId: number | null = null;

  private posicionInicialXMatriz = 0;

  private scrollInicialMatriz = 0;

  iniciarDesplazamientoMatriz(event: PointerEvent): void {
    /*
     * Solo botón izquierdo del mouse.
     */
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const objetivo = event.target as HTMLElement;

    /*
     * IMPORTANTE:
     *
     * Si agarramos un egreso proyectado,
     * NO queremos mover la matriz.
     *
     * Ahí debe funcionar el drag & drop
     * para cambiar su fecha.
     */
    if (
      objetivo.closest('.importe-egreso--proyectado') ||
      objetivo.closest('button') ||
      objetivo.closest('input') ||
      objetivo.closest('a') ||
      objetivo.closest('select') ||
      objetivo.closest('textarea')
    ) {
      return;
    }

    const contenedor = event.currentTarget as HTMLDivElement;

    this.arrastrandoMatriz = true;

    this.pointerMatrizId = event.pointerId;

    this.posicionInicialXMatriz = event.clientX;

    this.scrollInicialMatriz = contenedor.scrollLeft;

    /*
     * Esta es la parte importante.
     *
     * Aunque el cursor se mueva rápido
     * o salga temporalmente del contenedor,
     * seguimos recibiendo el movimiento.
     */
    contenedor.setPointerCapture(event.pointerId);
  }

  desplazarMatriz(event: PointerEvent): void {
    if (!this.arrastrandoMatriz || this.pointerMatrizId !== event.pointerId) {
      return;
    }

    const contenedor = event.currentTarget as HTMLDivElement;

    /*
     * Distancia recorrida desde
     * que empezó el arrastre.
     */
    const desplazamiento = event.clientX - this.posicionInicialXMatriz;

    /*
     * Si arrastras el mouse hacia la izquierda:
     * avanzamos hacia la derecha.
     *
     * Si arrastras hacia la derecha:
     * regresamos hacia la izquierda.
     */
    contenedor.scrollLeft = this.scrollInicialMatriz - desplazamiento;

    event.preventDefault();
  }
  finalizarDesplazamientoMatriz(event: PointerEvent): void {
    const contenedor = event.currentTarget as HTMLDivElement;

    if (contenedor.hasPointerCapture(event.pointerId)) {
      contenedor.releasePointerCapture(event.pointerId);
    }

    this.cancelarDesplazamientoMatriz();
  }
  cancelarDesplazamientoMatriz(): void {
    this.arrastrandoMatriz = false;

    this.pointerMatrizId = null;

    this.posicionInicialXMatriz = 0;

    this.scrollInicialMatriz = 0;
  }
  manejarAutoScrollArrastre(event: DragEvent): void {
    if (!this.movimientoArrastrado) {
      return;
    }

    const contenedor = this.cashflowTableWrap?.nativeElement;

    if (!contenedor) {
      return;
    }

    event.preventDefault();

    this.posicionXArrastre = event.clientX;

    const rect = contenedor.getBoundingClientRect();

    // Ancho real de la columna sticky "Concepto"
    const anchoConcepto =
      contenedor
        .querySelector<HTMLElement>('.cashflow-concept')
        ?.getBoundingClientRect().width ?? 0;

    const zonaBorde = 100;

    // La zona izquierda empieza DESPUÉS de la columna sticky
    const limiteIzquierdo = rect.left + anchoConcepto + zonaBorde;
    const limiteDerecho = rect.right - zonaBorde;

    if (event.clientX < limiteIzquierdo) {
      this.direccionAutoScroll = -1;
      this.iniciarAutoScroll();
      return;
    }

    if (event.clientX > limiteDerecho) {
      this.direccionAutoScroll = 1;
      this.iniciarAutoScroll();
      return;
    }

    this.direccionAutoScroll = 0;
    this.detenerAutoScroll();
  }
  private iniciarAutoScroll(): void {
    if (this.autoScrollFrameId !== null) {
      return;
    }

    const ejecutar = () => {
      const contenedor = this.cashflowTableWrap?.nativeElement;

      if (
        !contenedor ||
        !this.movimientoArrastrado ||
        this.direccionAutoScroll === 0
      ) {
        this.detenerAutoScroll();

        return;
      }

      /*
       * Velocidad horizontal.
       */
      const velocidad = 14;

      contenedor.scrollLeft += this.direccionAutoScroll * velocidad;

      this.autoScrollFrameId = requestAnimationFrame(ejecutar);
    };

    this.autoScrollFrameId = requestAnimationFrame(ejecutar);
  }

  private detenerAutoScroll(): void {
    if (this.autoScrollFrameId !== null) {
      cancelAnimationFrame(this.autoScrollFrameId);

      this.autoScrollFrameId = null;
    }

    this.direccionAutoScroll = 0;
  }
  detenerAutoScrollSiSale(event: DragEvent): void {
    const contenedor = this.cashflowTableWrap?.nativeElement;

    if (!contenedor) {
      return;
    }

    const relacionado = event.relatedTarget;

    /*
     * Si seguimos dentro de la matriz,
     * no detenemos nada.
     */
    if (relacionado instanceof Node && contenedor.contains(relacionado)) {
      return;
    }

    this.detenerAutoScroll();
  }

  /** Exporta exactamente las columnas y filas de la agrupación visible. */
  exportarExcel(vista: VistaFlujoCaja): void {
    if (!vista.columnas.length) {
      return;
    }
    const numeroColumnas = vista.columnas.length + 1;
    const matriz: (string | number)[][] = [
      ['FLUJO DE CAJA PARA GERENTES · SOLES (PEN)'],
      [`${vista.filtro.agrupacion.toUpperCase()} · ${this.descripcionPeriodo(vista.filtro)}`],
      [vista.saldoConfigurado ? 'Saldo de apertura registrado'
        : 'Saldo de apertura pendiente · importes provisionales'],
      ['CONCEPTO', ...vista.columnas.map((columna) => columna.etiqueta)],
      ...vista.filasMatriz.map((fila) => [
        fila.concepto,
        ...vista.columnas.map((columna) =>
          fila.tipo.startsWith('seccion-') ? '' : (fila.valores[columna.id] ?? 0)),
      ]),
    ];

    const hoja = XLSX.utils.aoa_to_sheet(matriz);
    hoja['!merges'] = [0, 1, 2].map((r) => ({
      s: { r, c: 0 }, e: { r, c: numeroColumnas - 1 },
    }));
    hoja['!cols'] = [
      { wch: 38 },
      ...vista.columnas.map((columna) => ({
        wch: columna.tipo === 'semana' ? 23 : 17,
      })),
    ];
    hoja['!freeze'] = { xSplit: 1, ySplit: 4 } as never;

    for (let filaIndice = 0; filaIndice < matriz.length; filaIndice++) {
      const fila = filaIndice >= 4 ? vista.filasMatriz[filaIndice - 4] : null;
      const esEncabezado = filaIndice <= 3;
      const esSeccion = Boolean(fila?.tipo.startsWith('seccion-'));
      const esTotal = Boolean(fila && [
        'subtotal', 'total', 'saldo-inicial', 'saldo-final', 'saldo-operativo',
      ].includes(fila.tipo));
      const fondo = esEncabezado ? (filaIndice === 3 ? '123047' : '17324D')
        : esSeccion ? (fila?.tipo === 'seccion-ingreso' ? 'DCEFE9' : 'FBE8DF')
        : esTotal ? 'E8EFF7' : (filaIndice % 2 === 0 ? 'FFFFFF' : 'F7F9FC');
      for (let columnaIndice = 0; columnaIndice < numeroColumnas; columnaIndice++) {
        const direccion = XLSX.utils.encode_cell({ r: filaIndice, c: columnaIndice });
        const celda = hoja[direccion];
        if (!celda) continue;
        celda.s = {
          font: {
            name: 'Aptos', sz: filaIndice === 0 ? 15 : 10,
            bold: esEncabezado || esSeccion || esTotal,
            color: { rgb: esEncabezado ? 'FFFFFF' : '243347' },
          },
          fill: { fgColor: { rgb: fondo } },
          alignment: {
            vertical: 'center',
            horizontal: columnaIndice === 0 ? 'left' : 'right',
          },
          border: { bottom: { style: 'hair', color: { rgb: 'D9E1EA' } } },
        };
        if (filaIndice >= 4 && columnaIndice > 0 && typeof celda.v === 'number') {
          celda.z = '"S/ "#,##0.00;[Red]("S/ "#,##0.00);"-"';
        }
      }
    }
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Flujo de caja');
    XLSX.writeFile(libro,
      `flujo-caja-${vista.filtro.agrupacion}-${vista.rango.fechaDesde}-${vista.rango.fechaHasta}.xlsx`);
  }

  get puedeGestionarMovimientos(): boolean {
    return this.sesionUsuarioService.puedeGestionarMovimientos;
  }
}
