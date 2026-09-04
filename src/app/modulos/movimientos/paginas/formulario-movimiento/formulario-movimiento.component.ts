import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { finalize, startWith, switchMap } from 'rxjs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  FileUp,
  LoaderCircle,
  LucideAngularModule,
  Save,
} from 'lucide-angular';

import {
  FlagCancelado,
  RegistrarMovimientoRequest,
} from '../../../../nucleo/modelos/movimiento';

import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';

import { ComprobanteXmlService } from '../../../../nucleo/servicios/comprobante-xml.service';

import { ConstanteService } from '../../../../nucleo/servicios/constante.service';

import { MovimientoService } from '../../../../nucleo/servicios/movimiento.service';

type CampoMovimiento =
  | 'tipoMovimiento'
  | 'fechaMovimiento'
  | 'fechaPago'
  | 'categoriaId'
  | 'descripcion'
  | 'monto'
  | 'medioPago'
  | 'tipoComprobante'
  | 'fechaComprobante'
  | 'serieComprobante'
  | 'numeroComprobante'
  | 'documentoEmisor'
  | 'razonSocialEmisor'
  | 'moneda'
  | 'observacion';

@Component({
  selector: 'app-formulario-movimiento',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],

  templateUrl: './formulario-movimiento.component.html',

  styleUrl: './formulario-movimiento.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioMovimientoComponent {
  readonly iconos = {
    volver: ArrowLeft,
    ingreso: ArrowUp,
    egreso: ArrowDown,
    xml: FileUp,
    correcto: Check,
    guardar: Save,
    cargando: LoaderCircle,
  };

  /* ======================================================
     DEPENDENCIAS
     ====================================================== */

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly formBuilder = inject(FormBuilder);

  private readonly destroyRef = inject(DestroyRef);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly categoriaService = inject(CategoriaService);

  private readonly movimientoService = inject(MovimientoService);

  private readonly comprobanteXmlService = inject(ComprobanteXmlService);

  readonly constanteService = inject(ConstanteService);

  /* ======================================================
     ESTADO GENERAL
     ====================================================== */

  readonly fechaActual = this.obtenerFechaActual();

  movimientoId: number | null = null;

  tipoMovimientoOriginal: number | null = null;

  estadoEgresoOriginal: FlagCancelado | null = null;

  guardando = false;

  cargandoMovimiento = false;

  errorGuardado = '';

  /* ======================================================
     ESTADO XML
     ====================================================== */

  procesandoXml = false;

  xmlProcesado = false;

  nombreArchivoXml = '';

  camposCompletadosXml = 0;

  errorXml = '';

  /* ======================================================
     FORMULARIO
     ====================================================== */

  readonly formulario = this.formBuilder.nonNullable.group({
    tipoMovimiento: [1, [Validators.required]],

    fechaMovimiento: [this.fechaActual, [Validators.required]],

    bCancelado: this.formBuilder.nonNullable.control<FlagCancelado>(1),

    fechaPago: [this.fechaActual],

    categoriaId: [0, [Validators.required, Validators.min(1)]],

    descripcion: ['', [Validators.required, Validators.maxLength(150)]],

    monto: [0, [Validators.required, Validators.min(0.01)]],

    medioPago: [1, [Validators.required]],

    moneda: [1, [Validators.required]],

    tipoComprobante: [5, [Validators.required]],

    fechaComprobante: [''],

    serieComprobante: ['', [Validators.maxLength(20)]],

    numeroComprobante: ['', [Validators.maxLength(50)]],

    documentoEmisor: ['', [Validators.maxLength(20)]],

    razonSocialEmisor: ['', [Validators.maxLength(200)]],

    observacion: ['', [Validators.maxLength(500)]],
  });

  /* ======================================================
     CATEGORÍAS SEGÚN TIPO
     ====================================================== */

  readonly categorias$ =
    this.formulario.controls.tipoMovimiento.valueChanges.pipe(
      startWith(this.formulario.controls.tipoMovimiento.value),

      switchMap((tipoMovimiento) =>
        this.categoriaService.listarCategoriasPorTipo(tipoMovimiento),
      ),
    );

  /* ======================================================
     CONSTRUCTOR
     ====================================================== */

  constructor() {
    /* ------------------------------------------------------
       CAMBIO INGRESO / EGRESO
       ------------------------------------------------------ */

    this.formulario.controls.tipoMovimiento.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tipoMovimiento) => {
        /*
            La categoría anterior puede
            pertenecer al otro tipo.
          */

        this.formulario.controls.categoriaId.setValue(0);

        /*
            El XML pertenece únicamente
            al flujo de egresos.
          */

        if (tipoMovimiento === 1) {
          this.limpiarDatosXml();
        }

        this.changeDetectorRef.markForCheck();
      });

    /* ------------------------------------------------------
       TIPO DE COMPROBANTE
       ------------------------------------------------------ */

    this.formulario.controls.tipoComprobante.valueChanges
      .pipe(
        startWith(this.formulario.controls.tipoComprobante.value),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tipoComprobante) => {
        const numeroControl = this.formulario.controls.numeroComprobante;

        /*
            5 = Sin comprobante
          */

        if (tipoComprobante === 5) {
          numeroControl.setValidators([Validators.maxLength(50)]);

          numeroControl.setValue('', {
            emitEvent: false,
          });

          this.formulario.controls.serieComprobante.setValue('', {
            emitEvent: false,
          });

          this.formulario.controls.fechaComprobante.setValue('', {
            emitEvent: false,
          });
        } else {
          numeroControl.setValidators([
            Validators.required,
            Validators.maxLength(50),
          ]);
        }

        numeroControl.updateValueAndValidity({
          emitEvent: false,
        });
      });

    /* ------------------------------------------------------
       DETECTAR EDICIÓN
       ------------------------------------------------------ */

    const parametroId = this.route.snapshot.paramMap.get('id');

    if (parametroId) {
      const id = Number(parametroId);

      if (Number.isInteger(id) && id > 0) {
        this.movimientoId = id;

        this.cargarMovimiento(id);
      } else {
        void this.router.navigate(['/movimientos']);
      }
    }
  }

  /* ======================================================
     MODO EDICIÓN
     ====================================================== */

  get modoEdicion(): boolean {
    return this.movimientoId !== null;
  }

  /* ======================================================
     TÍTULO
     ====================================================== */

  get tituloPagina(): string {
    return this.modoEdicion ? 'Editar movimiento' : 'Registrar movimiento';
  }

  /* ======================================================
     DESCRIPCIÓN
     ====================================================== */

  get descripcionPagina(): string {
    return this.modoEdicion
      ? 'Actualiza la información del movimiento seleccionado.'
      : 'Registra un nuevo ingreso o egreso de tu empresa.';
  }

  /* ======================================================
     TEXTO BOTÓN GUARDAR
     ====================================================== */

  get textoBotonGuardar(): string {
    if (this.mostrarFechaPago) {
      return 'Guardar y marcar como pagado';
    }

    return this.modoEdicion ? 'Guardar cambios' : 'Guardar movimiento';
  }

  /* ======================================================
     TIPO DE MOVIMIENTO SELECCIONADO
     ====================================================== */

  get tipoMovimientoSeleccionado(): number {
    return this.formulario.controls.tipoMovimiento.value;
  }

  get estadoEgresoSeleccionado(): FlagCancelado {
    return this.formulario.controls.bCancelado.value;
  }

  get esEgresoProyectadoEnEdicion(): boolean {
    return (
      this.modoEdicion &&
      this.tipoMovimientoOriginal === 2 &&
      this.estadoEgresoOriginal === 0
    );
  }

  get mostrarFechaPago(): boolean {
    return (
      this.esEgresoProyectadoEnEdicion &&
      this.estadoEgresoSeleccionado === 1
    );
  }

  /* ======================================================
     MOSTRAR NÚMERO DE COMPROBANTE
     ====================================================== */

  get mostrarNumeroComprobante(): boolean {
    return this.formulario.controls.tipoComprobante.value !== 5;
  }

  /* ======================================================
     SELECCIONAR TIPO
     ====================================================== */

  seleccionarTipo(tipoMovimiento: number): void {
    if (this.modoEdicion) {
      return;
    }

    if (this.formulario.controls.tipoMovimiento.value === tipoMovimiento) {
      return;
    }

    this.formulario.controls.tipoMovimiento.setValue(tipoMovimiento);
  }

  seleccionarEstadoEgreso(estado: FlagCancelado): void {
    if (!this.esEgresoProyectadoEnEdicion) {
      return;
    }

    const fechaPagoControl = this.formulario.controls.fechaPago;

    this.formulario.controls.bCancelado.setValue(estado);

    if (estado === 1) {
      fechaPagoControl.setValidators([Validators.required]);

      if (!fechaPagoControl.value) {
        fechaPagoControl.setValue(this.fechaActual);
      }
    } else {
      fechaPagoControl.clearValidators();
    }

    fechaPagoControl.updateValueAndValidity();
  }

  /* ======================================================
     SELECCIONAR XML
     ====================================================== */

  seleccionarArchivoXml(event: Event): void {
    this.errorXml = '';

    const input = event.target as HTMLInputElement;

    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    if (this.tipoMovimientoSeleccionado !== 2) {
      this.errorXml = 'La carga de XML solo está disponible para egresos.';

      input.value = '';

      return;
    }

    this.procesarArchivoXml(archivo);

    /*
      Permite seleccionar nuevamente
      el mismo archivo.
    */

    input.value = '';
  }

  /* ======================================================
     PROCESAR XML
     ====================================================== */

  private procesarArchivoXml(archivo: File): void {
    this.procesandoXml = true;

    this.xmlProcesado = false;

    this.nombreArchivoXml = '';

    this.camposCompletadosXml = 0;

    this.errorXml = '';

    this.comprobanteXmlService
      .procesarXml(archivo)
      .pipe(
        finalize(() => {
          this.procesandoXml = false;

          this.changeDetectorRef.markForCheck();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.nombreArchivoXml = resultado.nombreArchivo;

          this.camposCompletadosXml = resultado.camposEncontrados;

          /* ------------------------------------------
               FECHA DE EMISIÓN
               ------------------------------------------ */

          if (resultado.fechaEmision) {
            this.formulario.controls.fechaComprobante.setValue(
              resultado.fechaEmision,
            );
          }

          /* ------------------------------------------
               TIPO DE COMPROBANTE
               ------------------------------------------ */

          if (resultado.tipoComprobante !== undefined) {
            this.formulario.controls.tipoComprobante.setValue(
              resultado.tipoComprobante,
            );
          }

          /* ------------------------------------------
               SERIE
               ------------------------------------------ */

          if (resultado.serie) {
            this.formulario.controls.serieComprobante.setValue(resultado.serie);
          }

          /* ------------------------------------------
               NÚMERO
               ------------------------------------------ */

          if (resultado.numero) {
            this.formulario.controls.numeroComprobante.setValue(
              resultado.numero,
            );
          }

          /* ------------------------------------------
               MONEDA
               ------------------------------------------ */

          if (resultado.moneda !== undefined) {
            this.formulario.controls.moneda.setValue(resultado.moneda);
          }

          /* ------------------------------------------
               IMPORTE
               ------------------------------------------ */

          if (resultado.importeTotal !== undefined) {
            this.formulario.controls.monto.setValue(resultado.importeTotal);
          }

          /* ------------------------------------------
               DOCUMENTO DEL EMISOR
               ------------------------------------------ */

          if (resultado.documentoEmisor) {
            this.formulario.controls.documentoEmisor.setValue(
              resultado.documentoEmisor,
            );
          }

          /* ------------------------------------------
               RAZÓN SOCIAL
               ------------------------------------------ */

          if (resultado.razonSocialEmisor) {
            this.formulario.controls.razonSocialEmisor.setValue(
              resultado.razonSocialEmisor,
            );
          }

          /* ------------------------------------------
               DESCRIPCIÓN
               ------------------------------------------ */

          if (resultado.descripcion) {
            this.completarDescripcionDesdeXml(resultado.descripcion);
          }

          this.xmlProcesado = true;

          this.errorXml = '';

          this.changeDetectorRef.markForCheck();
        },

        error: (error) => {
          this.xmlProcesado = false;

          this.nombreArchivoXml = '';

          this.camposCompletadosXml = 0;

          this.errorXml =
            error instanceof Error
              ? error.message
              : 'No se pudo procesar el archivo XML.';

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /* ======================================================
     COMPLETAR DESCRIPCIÓN DESDE XML
     ====================================================== */

  private completarDescripcionDesdeXml(descripcion: string): void {
    const descripcionActual = this.formulario.controls.descripcion.value.trim();

    /*
      No reemplazamos una descripción
      escrita manualmente por el usuario.
    */

    if (!descripcionActual) {
      this.formulario.controls.descripcion.setValue(descripcion);
    }
  }

  /* ======================================================
     QUITAR XML
     ====================================================== */

  quitarXml(): void {
    this.xmlProcesado = false;

    this.nombreArchivoXml = '';

    this.camposCompletadosXml = 0;

    this.errorXml = '';
  }

  /* ======================================================
     LIMPIAR DATOS XML
     ====================================================== */

  private limpiarDatosXml(): void {
    this.xmlProcesado = false;

    this.nombreArchivoXml = '';

    this.camposCompletadosXml = 0;

    this.errorXml = '';

    this.formulario.patchValue({
      tipoComprobante: 5,

      fechaComprobante: '',

      serieComprobante: '',

      numeroComprobante: '',

      documentoEmisor: '',

      razonSocialEmisor: '',
    });
  }

  /* ======================================================
     GUARDAR MOVIMIENTO
     ====================================================== */

  guardar(): void {
    this.errorGuardado = '';

    if (
      this.formulario.invalid ||
      this.guardando ||
      this.procesandoXml ||
      this.cargandoMovimiento
    ) {
      this.formulario.markAllAsTouched();

      return;
    }

    this.guardando = true;

    const datos = this.formulario.getRawValue();

    const tipoMovimiento =
      this.modoEdicion && this.tipoMovimientoOriginal !== null
        ? this.tipoMovimientoOriginal
        : datos.tipoMovimiento;

    const marcarComoPagado =
      this.esEgresoProyectadoEnEdicion && datos.bCancelado === 1;

    const request: RegistrarMovimientoRequest = {
      tipoMovimiento,

      fechaMovimiento: datos.fechaMovimiento,

      fechaProyectada:
        tipoMovimiento === 2 && this.modoEdicion
          ? datos.fechaMovimiento
          : undefined,

      fechaPago:
        tipoMovimiento === 2 && !this.modoEdicion
          ? datos.fechaMovimiento
          : undefined,

      categoriaId: datos.categoriaId,

      descripcion: datos.descripcion.trim(),

      monto: Number(datos.monto),

      medioPago: datos.medioPago,

      moneda: datos.moneda,

      tipoComprobante: datos.tipoComprobante,

      fechaComprobante: datos.fechaComprobante || undefined,

      serieComprobante: datos.serieComprobante.trim() || undefined,

      numeroComprobante: datos.numeroComprobante.trim() || undefined,

      documentoEmisor: datos.documentoEmisor.trim() || undefined,

      razonSocialEmisor: datos.razonSocialEmisor.trim() || undefined,

      observacion: datos.observacion.trim() || undefined,

      archivoXmlNombre: this.xmlProcesado ? this.nombreArchivoXml : undefined,

      /*
          1 = Registro manual
          2 = Registro asistido por XML
        */

      origenRegistro: this.xmlProcesado ? 2 : 1,

      /*
          Los egresos individuales se
          registran actualmente como
          egresos ya pagados/cancelados.

          0 = Proyectado
          1 = Cancelado/Pagado
        */

      bCancelado:
        tipoMovimiento === 2
          ? this.modoEdicion
            ? (this.estadoEgresoOriginal ?? 1)
            : 1
          : undefined,
    };

    const actualizacion$ =
      this.modoEdicion && this.movimientoId !== null
        ? this.movimientoService.actualizarMovimiento(
            this.movimientoId,
            request,
          )
        : this.movimientoService.registrarMovimiento(request);

    const operacion$ =
      marcarComoPagado && this.movimientoId !== null
        ? actualizacion$.pipe(
            switchMap(() =>
              this.movimientoService.marcarEgresoComoCancelado(
                this.movimientoId!,
                {
                  fechaPago: datos.fechaPago,
                },
              ),
            ),
          )
        : actualizacion$;

    operacion$
      .pipe(
        finalize(() => {
          this.guardando = false;

          this.changeDetectorRef.markForCheck();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/movimientos']);
        },

        error: (error) => {
          this.errorGuardado =
            error instanceof Error
              ? error.message
              : 'No se pudo guardar el movimiento.';

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /* ======================================================
     CARGAR MOVIMIENTO PARA EDITAR
     ====================================================== */

  private cargarMovimiento(id: number): void {
    this.cargandoMovimiento = true;

    this.errorGuardado = '';

    this.movimientoService
      .obtenerMovimientoPorId(id)
      .pipe(
        finalize(() => {
          this.cargandoMovimiento = false;

          this.changeDetectorRef.markForCheck();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (movimiento) => {
          if (!movimiento) {
            void this.router.navigate(['/movimientos']);

            return;
          }

          const estadoEgreso: FlagCancelado =
            movimiento.bCancelado === 0 ? 0 : 1;

          if (movimiento.tipoMovimiento === 2 && estadoEgreso === 1) {
            void this.router.navigate(['/movimientos', movimiento.id]);

            return;
          }

          /*
              Primero establecemos el tipo.

              Esto actualiza las categorías
              correspondientes al movimiento.
            */

          this.tipoMovimientoOriginal = movimiento.tipoMovimiento;

          this.estadoEgresoOriginal = estadoEgreso;

          this.formulario.controls.tipoMovimiento.setValue(
            movimiento.tipoMovimiento,
          );

          this.formulario.patchValue({
            fechaMovimiento: movimiento.fechaMovimiento,

            bCancelado: estadoEgreso,

            fechaPago: movimiento.fechaPago ?? this.fechaActual,

            categoriaId: movimiento.categoriaId,

            descripcion: movimiento.descripcion,

            monto: movimiento.monto,

            medioPago: movimiento.medioPago,

            moneda: movimiento.moneda,

            tipoComprobante: movimiento.tipoComprobante,

            fechaComprobante: movimiento.fechaComprobante ?? '',

            serieComprobante: movimiento.serieComprobante ?? '',

            numeroComprobante: movimiento.numeroComprobante ?? '',

            documentoEmisor: movimiento.documentoEmisor ?? '',

            razonSocialEmisor: movimiento.razonSocialEmisor ?? '',

            observacion: movimiento.observacion ?? '',
          });

          /*
              Restauramos información
              relacionada con XML.
            */

          if (movimiento.origenRegistro === 2 || movimiento.archivoXmlNombre) {
            this.xmlProcesado = true;

            this.nombreArchivoXml =
              movimiento.archivoXmlNombre ?? 'Comprobante XML';

            this.camposCompletadosXml = 0;
          } else {
            this.xmlProcesado = false;

            this.nombreArchivoXml = '';

            this.camposCompletadosXml = 0;
          }

          this.formulario.markAsPristine();

          this.formulario.markAsUntouched();

          this.changeDetectorRef.markForCheck();
        },

        error: () => {
          this.errorGuardado = 'No se pudo cargar el movimiento.';

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /* ======================================================
     CANCELAR
     ====================================================== */

  cancelar(): void {
    void this.router.navigate(['/movimientos']);
  }

  /* ======================================================
     MOSTRAR ERROR
     ====================================================== */

  mostrarError(campo: CampoMovimiento): boolean {
    const control = this.formulario.controls[campo];

    return control.touched && control.invalid;
  }

  /* ======================================================
     ETIQUETA TIPO MOVIMIENTO
     ====================================================== */

  etiquetaTipoMovimiento(tipoMovimiento: number): string {
    return this.constanteService.obtenerDescripcion(100, tipoMovimiento);
  }

  /* ======================================================
     ETIQUETA MEDIO DE PAGO
     ====================================================== */

  etiquetaMedioPago(medioPago: number): string {
    return this.constanteService.obtenerDescripcion(200, medioPago);
  }

  /* ======================================================
     ETIQUETA COMPROBANTE
     ====================================================== */

  etiquetaComprobante(tipoComprobante: number): string {
    return this.constanteService.obtenerDescripcion(300, tipoComprobante);
  }

  /* ======================================================
     ETIQUETA MONEDA
     ====================================================== */

  etiquetaMoneda(moneda: number): string {
    return this.constanteService.obtenerDescripcion(400, moneda);
  }

  /* ======================================================
     FECHA ACTUAL
     ====================================================== */

  private obtenerFechaActual(): string {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, '0');

    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}
