import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellValueChangedEvent,
  ClientSideRowModelModule,
  ColDef,
  DateFilterModule,
  GridApi,
  GridReadyEvent,
  Module,
  NumberFilterModule,
  PaginationModule,
  QuickFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
  SelectEditorModule,
  SelectionChangedEvent,
  TextFilterModule,
  TooltipModule,
  themeQuartz,
} from 'ag-grid-community';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCheck,
  CircleCheck,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  LucideAngularModule,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-angular';
import { finalize } from 'rxjs';

import {
  EstadoEgresoTexto,
  FilaCargaMasivaEgreso,
  ResultadoCargaMasivaEgreso,
} from '../../../../nucleo/modelos/carga-masiva-movimiento';
import { CargaMasivaMovimientoService } from '../../../../nucleo/servicios/carga-masiva-movimiento.service';
import { SelectFloatingFilterComponent } from './select-floating-filter.component';

@Component({
  selector: 'app-carga-masiva-movimientos',
  standalone: true,
  imports: [CommonModule, AgGridAngular, LucideAngularModule],
  templateUrl: './carga-masiva-movimientos.component.html',
  styleUrl: './carga-masiva-movimientos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaMasivaMovimientosComponent {
  private readonly cargaMasivaService = inject(CargaMasivaMovimientoService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly nombrePlantilla = 'plantilla-carga-masiva-egresos.xlsx';

  readonly iconos = {
    volver: ArrowLeft,
    descargar: Download,
    archivo: FileSpreadsheet,
    subir: Upload,
    buscar: Search,
    limpiar: RotateCcw,
    quitar: Trash2,
    advertencia: TriangleAlert,
    correcto: CircleCheck,
    cargando: LoaderCircle,
    informacion: Info,
    aplicar: CheckCheck,
    total: CircleDollarSign,
    completado: BadgeCheck,
  };

  archivoSeleccionado: File | null = null;
  resultado: ResultadoCargaMasivaEgreso | null = null;
  procesandoArchivo = false;
  descargandoPlantilla = false;
  guardandoCarga = false;
  cargaCompletada = false;
  movimientosRegistrados = 0;
  filasSeleccionadas = 0;
  errorArchivo = '';
  errorRegistro = '';

  private gridApi: GridApi<FilaCargaMasivaEgreso> | null = null;

  readonly modulosGrid: Module[] = [
    ClientSideRowModelModule,
    PaginationModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    QuickFilterModule,
    RowSelectionModule,
    SelectEditorModule,
    TooltipModule,
  ];

  readonly temaGrid = themeQuartz.withParams({
    accentColor: '#2563eb',
    backgroundColor: '#ffffff',
    foregroundColor: '#334155',
    borderColor: '#e2e8f0',
    headerBackgroundColor: '#f8fafc',
    headerTextColor: '#475569',
    rowHoverColor: '#f8fafc',
    selectedRowBackgroundColor: '#eff6ff',
    borderRadius: 12,
    spacing: 6,
  });

  readonly tamanioPagina = 10;
  readonly opcionesTamanioPagina = [10, 25, 50, 100];

  readonly seleccionFilas: RowSelectionOptions<FilaCargaMasivaEgreso> = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
    selectAll: 'filtered',
    enableClickSelection: false,
    isRowSelectable: (fila) => Boolean(fila.data?.valido),
  };

  readonly columnaSeleccion: ColDef<FilaCargaMasivaEgreso> = {
    width: 48,
    minWidth: 48,
    maxWidth: 48,
    resizable: false,
    sortable: false,
    suppressHeaderMenuButton: true,
  };

  readonly defaultColDef: ColDef<FilaCargaMasivaEgreso> = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
  };

  readonly columnDefs: ColDef<FilaCargaMasivaEgreso>[] = [
    {
      headerName: 'Fila',
      field: 'filaExcel',
      width: 88,
      minWidth: 88,
      maxWidth: 88,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'fechaMovimiento',
      headerName: 'Fecha',
      width: 150,
      minWidth: 140,
      filter: 'agDateColumnFilter',
      filterParams: {
        browserDatePicker: true,
        maxNumConditions: 1,
        comparator: (fechaFiltro: Date, valorCelda: string | null) => {
          if (!valorCelda) {
            return -1;
          }

          const [anio, mes, dia] = valorCelda.split('-').map(Number);
          const fechaCelda = new Date(anio, mes - 1, dia);
          return fechaCelda < fechaFiltro ? -1 : fechaCelda > fechaFiltro ? 1 : 0;
        },
      },
      valueFormatter: (parametros) =>
        this.formatearFecha(parametros.value as string | undefined),
    },
    {
      field: 'descripcion',
      headerName: 'Descripción',
      minWidth: 250,
      flex: 1,
      filter: 'agTextColumnFilter',
      tooltipField: 'descripcion',
    },
    {
      field: 'categoria',
      headerName: 'Clasificador',
      width: 190,
      minWidth: 170,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['equals'],
        defaultOption: 'equals',
        maxNumConditions: 1,
      },
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: {
        valores: () => this.categoriasDisponibles,
        placeholder: 'Todas',
      },
      suppressFloatingFilterButton: true,
    },
    {
      field: 'monto',
      headerName: 'Monto',
      width: 145,
      minWidth: 135,
      filter: 'agNumberColumnFilter',
      valueFormatter: (parametros) => this.formatearMonto(parametros.value),
      cellClass: 'monto-celda',
    },
    {
      field: 'estadoTexto',
      headerName: 'Estado',
      width: 165,
      minWidth: 155,
      editable: (parametros) => Boolean(parametros.data?.valido),
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Proyectado', 'Pagado'],
      },
      singleClickEdit: true,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['equals'],
        defaultOption: 'equals',
        maxNumConditions: 1,
      },
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: {
        valores: () => ['Proyectado', 'Pagado'],
        placeholder: 'Todos',
      },
      suppressFloatingFilterButton: true,
      cellClassRules: {
        'estado-pagado': (parametros) => parametros.value === 'Pagado',
        'estado-proyectado': (parametros) =>
          parametros.value === 'Proyectado',
      },
    },
    {
      headerName: 'Validación',
      width: 145,
      minWidth: 135,
      filter: 'agTextColumnFilter',
      valueGetter: (parametros) =>
        parametros.data?.valido ? 'Correcto' : 'Error',
      filterValueGetter: (parametros) =>
        parametros.data?.valido ? 'Correcto' : 'Error',
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: {
        valores: () => ['Correcto', 'Error'],
        placeholder: 'Todos',
      },
      suppressFloatingFilterButton: true,
      cellClassRules: {
        'validacion-correcta': (parametros) => parametros.value === 'Correcto',
        'validacion-error': (parametros) => parametros.value === 'Error',
      },
    },
    {
      headerName: 'Detalle de validación',
      minWidth: 280,
      flex: 1,
      sortable: false,
      filter: 'agTextColumnFilter',
      valueGetter: (parametros) =>
        parametros.data?.errores.length
          ? parametros.data.errores.join(' ')
          : 'Sin observaciones',
      tooltipValueGetter: (parametros) =>
        parametros.data?.errores.length
          ? parametros.data.errores.join('\n')
          : 'Sin observaciones',
    },
  ];

  get filasGrid(): FilaCargaMasivaEgreso[] {
    return this.resultado?.filas ?? [];
  }

  get categoriasDisponibles(): string[] {
    const valores = (this.resultado?.filas ?? [])
      .map((fila) => fila.categoria?.trim())
      .filter((valor): valor is string => Boolean(valor));
    return [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get puedeConfirmarCarga(): boolean {
    return (
      this.resultado !== null &&
      this.resultado.totalFilas > 0 &&
      this.resultado.filasConError === 0 &&
      !this.procesandoArchivo &&
      !this.guardandoCarga &&
      !this.cargaCompletada
    );
  }

  get montoTotal(): number {
    return this.resultado
      ? this.resultado.montoPagado + this.resultado.montoProyectado
      : 0;
  }

  get porcentajeCorrectos(): number {
    if (!this.resultado || this.resultado.totalFilas === 0) {
      return 0;
    }

    return Math.round(
      (this.resultado.filasValidas / this.resultado.totalFilas) * 100,
    );
  }

  onGridReady(event: GridReadyEvent<FilaCargaMasivaEgreso>): void {
    this.gridApi = event.api;
  }

  onSeleccionCambiada(
    event: SelectionChangedEvent<FilaCargaMasivaEgreso>,
  ): void {
    this.filasSeleccionadas = event.api.getSelectedRows().length;
    this.changeDetectorRef.markForCheck();
  }

  onValorCeldaCambiado(
    event: CellValueChangedEvent<FilaCargaMasivaEgreso>,
  ): void {
    if (event.colDef.field !== 'estadoTexto' || !event.data) {
      return;
    }

    const estado = event.newValue as EstadoEgresoTexto;
    event.data.bCancelado = estado === 'Pagado' ? 1 : 0;
    this.recalcularResumen();
  }

  buscarEnGrid(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.gridApi?.setGridOption('quickFilterText', input.value.trim());
  }

  limpiarFiltrosGrid(): void {
    this.gridApi?.setFilterModel(null);
    this.gridApi?.setGridOption('quickFilterText', '');
    this.gridApi?.deselectAll();
    this.filasSeleccionadas = 0;
  }

  aplicarEstadoSeleccionados(estado: EstadoEgresoTexto): void {
    if (!this.gridApi || this.cargaCompletada) {
      return;
    }

    const filas = this.gridApi.getSelectedRows().filter((fila) => fila.valido);
    for (const fila of filas) {
      fila.estadoTexto = estado;
      fila.bCancelado = estado === 'Pagado' ? 1 : 0;
    }

    this.gridApi.applyTransaction({ update: filas });
    this.recalcularResumen();
  }

  descargarPlantilla(): void {
    if (this.descargandoPlantilla) {
      return;
    }

    this.descargandoPlantilla = true;
    this.errorArchivo = '';

    this.cargaMasivaService
      .descargarPlantilla()
      .pipe(
        finalize(() => {
          this.descargandoPlantilla = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (archivo) => {
          const url = URL.createObjectURL(archivo);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = this.nombrePlantilla;
          enlace.click();
          URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.errorArchivo =
            error instanceof Error
              ? error.message
              : 'No se pudo descargar la plantilla.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo || this.procesandoArchivo || this.guardandoCarga) {
      return;
    }

    this.archivoSeleccionado = archivo;
    this.resultado = null;
    this.errorArchivo = '';
    this.errorRegistro = '';
    this.cargaCompletada = false;
    this.movimientosRegistrados = 0;
    this.procesandoArchivo = true;
    this.limpiarFiltrosGrid();

    this.cargaMasivaService
      .procesarArchivo(archivo)
      .pipe(
        finalize(() => {
          this.procesandoArchivo = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.resultado = resultado;
          this.gridApi?.paginationGoToFirstPage();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.archivoSeleccionado = null;
          this.resultado = null;
          this.errorArchivo =
            error instanceof Error
              ? error.message
              : 'No se pudo procesar el archivo Excel.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  limpiarArchivo(): void {
    if (this.procesandoArchivo || this.guardandoCarga) {
      return;
    }

    this.archivoSeleccionado = null;
    this.resultado = null;
    this.errorArchivo = '';
    this.errorRegistro = '';
    this.cargaCompletada = false;
    this.movimientosRegistrados = 0;
    this.limpiarFiltrosGrid();
  }

  confirmarCarga(): void {
    if (!this.resultado || !this.puedeConfirmarCarga) {
      return;
    }

    this.guardandoCarga = true;
    this.errorRegistro = '';

    this.cargaMasivaService
      .registrarResultado(this.resultado)
      .pipe(
        finalize(() => {
          this.guardandoCarga = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cantidadRegistrada) => {
          this.movimientosRegistrados = cantidadRegistrada;
          this.cargaCompletada = true;
          this.gridApi?.deselectAll();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          this.errorRegistro =
            error instanceof Error
              ? error.message
              : 'No se pudieron registrar los egresos.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  cerrar(): void {
    if (!this.guardandoCarga) {
      void this.router.navigate(['/movimientos']);
    }
  }

  private recalcularResumen(): void {
    if (!this.resultado) {
      return;
    }

    const validas = this.resultado.filas.filter((fila) => fila.valido);
    const pagadas = validas.filter((fila) => fila.bCancelado === 1);
    const proyectadas = validas.filter((fila) => fila.bCancelado === 0);

    this.resultado = {
      ...this.resultado,
      totalPagados: pagadas.length,
      totalProyectados: proyectadas.length,
      montoPagado: pagadas.reduce((total, fila) => total + fila.monto, 0),
      montoProyectado: proyectadas.reduce(
        (total, fila) => total + fila.monto,
        0,
      ),
    };

    this.changeDetectorRef.markForCheck();
  }

  private readonly formateadorMoneda = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  });

  private formatearMonto(monto: number | null | undefined): string {
    return this.formateadorMoneda.format(Number(monto ?? 0));
  }

  private formatearFecha(fecha?: string): string {
    if (!fecha) {
      return '';
    }

    const [anio, mes, dia] = fecha.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }
}
