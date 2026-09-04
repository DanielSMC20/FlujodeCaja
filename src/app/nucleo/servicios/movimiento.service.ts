import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  throwError,
} from 'rxjs';

import {
  CancelarEgresoRequest,
  Movimiento,
  RegistrarMovimientoRequest,
} from '../modelos/movimiento';

import { MovimientoResumen } from '../modelos/dashboard.model';

import { CategoriaService } from './categoria.service';

import { SesionEmpresaService } from './sesion-empresa.service';

@Injectable({
  providedIn: 'root',
})
export class MovimientoService {
  private readonly movimientos: Movimiento[] = [
    {
      id: 1,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 1,
      categoria: 'Ventas',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Venta del día - mostrador',
      monto: 1820,
      medioPago: 1,
      tipoComprobante: 2,
      fechaComprobante: '2026-07-03',
      serieComprobante: 'B001',
      numeroComprobante: '00000125',
      moneda: 1,
      origenRegistro: 1,
      observacion: 'Cierre parcial de caja',
      usuarioRegistro: 'Gerente',
      fechaRegistro: '2026-07-03T18:20:00',
    },
    {
      id: 2,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 4,
      categoria: 'Alquiler',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Alquiler del local',
      monto: 700,
      medioPago: 2,
      tipoComprobante: 1,
      fechaComprobante: '2026-07-01',
      serieComprobante: 'F001',
      numeroComprobante: '00000320',
      documentoEmisor: '20548796321',
      razonSocialEmisor: 'Inmobiliaria Central SAC',
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Gerente',
      fechaRegistro: '2026-07-03T19:05:00',
    },
    {
      id: 3,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 2,
      categoria: 'Cobros',
      fechaMovimiento: '2026-07-04',
      descripcion: 'Servicio técnico',
      monto: 650,
      medioPago: 2,
      tipoComprobante: 4,
      fechaComprobante: '2026-07-04',
      serieComprobante: 'NV01',
      numeroComprobante: '00000452',
      moneda: 1,
      origenRegistro: 1,
      observacion: 'Pago de cliente recurrente',
      usuarioRegistro: 'Gerente',
      fechaRegistro: '2026-07-04T11:30:00',
    },
    {
      id: 4,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 5,
      categoria: 'Servicios básicos',
      fechaMovimiento: '2026-07-04',
      descripcion: 'Pago de servicio',
      monto: 340,
      medioPago: 1,
      tipoComprobante: 5,
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Gerente',
      fechaRegistro: '2026-07-04T12:15:00',
    },

    {
      id: 5,
      empresaId: 2,
      tipoMovimiento: 1,
      categoriaId: 7,
      categoria: 'Venta en barra',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Ventas de barra',
      monto: 3250,
      medioPago: 2,
      tipoComprobante: 2,
      fechaComprobante: '2026-07-03',
      serieComprobante: 'B002',
      numeroComprobante: '00000210',
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Administrador',
      fechaRegistro: '2026-07-03T23:30:00',
    },
    {
      id: 6,
      empresaId: 2,
      tipoMovimiento: 1,
      categoriaId: 8,
      categoria: 'Entradas',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Venta de entradas',
      monto: 1400,
      medioPago: 1,
      tipoComprobante: 2,
      fechaComprobante: '2026-07-03',
      serieComprobante: 'B002',
      numeroComprobante: '00000211',
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Administrador',
      fechaRegistro: '2026-07-03T22:30:00',
    },
    {
      id: 7,
      empresaId: 2,
      tipoMovimiento: 2,
      categoriaId: 9,
      categoria: 'DJ / Artistas',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Pago DJ evento viernes',
      monto: 900,
      medioPago: 1,
      tipoComprobante: 3,
      fechaComprobante: '2026-07-03',
      serieComprobante: 'E001',
      numeroComprobante: '00000044',
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Administrador',
      fechaRegistro: '2026-07-03T20:00:00',
    },
    {
      id: 8,
      empresaId: 2,
      tipoMovimiento: 2,
      categoriaId: 10,
      categoria: 'Seguridad',
      fechaMovimiento: '2026-07-03',
      descripcion: 'Pago personal de seguridad',
      monto: 500,
      medioPago: 1,
      tipoComprobante: 5,
      moneda: 1,
      origenRegistro: 1,
      observacion: '',
      usuarioRegistro: 'Administrador',
      fechaRegistro: '2026-07-03T19:30:00',
    },
  ];

  private readonly movimientosSubject = new BehaviorSubject<Movimiento[]>(
    this.copiarMovimientos(),
  );

  constructor(
    private readonly categoriaService: CategoriaService,

    private readonly sesionEmpresaService: SesionEmpresaService,
  ) {}

  listarMovimientos(tipoMovimiento?: number): Observable<Movimiento[]> {
    return combineLatest([
      this.movimientosSubject,
      this.sesionEmpresaService.empresaActual$,
    ]).pipe(
      map(([movimientos, empresa]) => {
        let resultado = movimientos.filter(
          (movimiento) => movimiento.empresaId === empresa.id,
        );

        if (tipoMovimiento) {
          resultado = resultado.filter(
            (movimiento) => movimiento.tipoMovimiento === tipoMovimiento,
          );
        }

        return resultado.map((movimiento) => ({
          ...movimiento,
        }));
      }),
    );
  }

  obtenerMovimientoPorId(id: number): Observable<Movimiento | null> {
    return combineLatest([
      this.movimientosSubject,
      this.sesionEmpresaService.empresaActual$,
    ]).pipe(
      map(([movimientos, empresa]) => {
        const movimiento = movimientos.find(
          (item) => item.id === id && item.empresaId === empresa.id,
        );

        return movimiento
          ? {
              ...movimiento,
            }
          : null;
      }),
    );
  }

  registrarMovimiento(
    request: RegistrarMovimientoRequest,
  ): Observable<Movimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const categoria = this.categoriaService.obtenerCategoriaPorId(
      request.categoriaId,
    );

    if (!categoria) {
      return throwError(
        () => new Error('La categoría seleccionada no existe.'),
      );
    }

    if (categoria.empresaId !== empresaActualId) {
      return throwError(
        () => new Error('La categoría no pertenece a la empresa actual.'),
      );
    }

    if (!categoria.estado) {
      return throwError(
        () => new Error('La categoría seleccionada se encuentra inactiva.'),
      );
    }

    if (categoria.tipoMovimiento !== request.tipoMovimiento) {
      return throwError(
        () => new Error('La categoría no corresponde al tipo de movimiento.'),
      );
    }

    const nuevoId =
      this.movimientos.length > 0
        ? Math.max(...this.movimientos.map((movimiento) => movimiento.id)) + 1
        : 1;

    const bCancelado =
      request.tipoMovimiento === 2 ? request.bCancelado ?? 1 : 1;

    const nuevoMovimiento: Movimiento = {
      id: nuevoId,

      empresaId: empresaActualId,

      tipoMovimiento: request.tipoMovimiento,

      categoriaId: request.categoriaId,

      categoria: categoria.nombre,

      fechaMovimiento: request.fechaMovimiento,

      fechaProyectada:
        request.tipoMovimiento === 2 && bCancelado === 0
          ? request.fechaMovimiento
          : undefined,

      fechaPago:
        request.tipoMovimiento === 2 && bCancelado === 1
          ? request.fechaMovimiento
          : undefined,

      bCancelado,

      cancelado: bCancelado === 1,

      descripcion: request.descripcion.trim(),

      monto: request.monto,

      medioPago: request.medioPago,

      tipoComprobante: request.tipoComprobante,

      fechaComprobante: request.fechaComprobante || undefined,

      serieComprobante: request.serieComprobante?.trim() || undefined,

      numeroComprobante: request.numeroComprobante?.trim() || undefined,

      documentoEmisor: request.documentoEmisor?.trim() || undefined,

      razonSocialEmisor: request.razonSocialEmisor?.trim() || undefined,

      moneda: request.moneda,

      origenRegistro: request.origenRegistro ?? 1,

      archivoXmlNombre: request.archivoXmlNombre || undefined,

      hashXml: request.hashXml || undefined,

      observacion: request.observacion?.trim() || undefined,

      usuarioRegistro: empresaActualId === 1 ? 'Gerente' : 'Administrador',

      fechaRegistro: new Date().toISOString(),
    };

    this.movimientos.unshift(nuevoMovimiento);

    this.notificarCambios();

    return of({
      ...nuevoMovimiento,
    });
  }

  actualizarMovimiento(
    id: number,
    request: RegistrarMovimientoRequest,
  ): Observable<Movimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const indice = this.movimientos.findIndex(
      (movimiento) =>
        movimiento.id === id && movimiento.empresaId === empresaActualId,
    );

    if (indice === -1) {
      return throwError(() => new Error('El movimiento no existe.'));
    }

    const categoria = this.categoriaService.obtenerCategoriaPorId(
      request.categoriaId,
    );

    if (!categoria) {
      return throwError(
        () => new Error('La categoría seleccionada no existe.'),
      );
    }

    if (categoria.empresaId !== empresaActualId) {
      return throwError(
        () => new Error('La categoría no pertenece a la empresa actual.'),
      );
    }

    if (categoria.tipoMovimiento !== request.tipoMovimiento) {
      return throwError(
        () => new Error('La categoría no corresponde al tipo de movimiento.'),
      );
    }

    const movimientoActual = this.movimientos[indice];

    const bCancelado =
      request.tipoMovimiento === 2
        ? movimientoActual.bCancelado ?? 1
        : 1;

    const movimientoActualizado: Movimiento = {
      ...movimientoActual,

      tipoMovimiento: request.tipoMovimiento,

      categoriaId: request.categoriaId,

      categoria: categoria.nombre,

      fechaMovimiento: request.fechaMovimiento,

      fechaProyectada:
        request.tipoMovimiento === 2 && bCancelado === 0
          ? request.fechaMovimiento
          : undefined,

      fechaPago:
        request.tipoMovimiento === 2 && bCancelado === 1
          ? request.fechaMovimiento
          : undefined,

      bCancelado,

      cancelado: bCancelado === 1,

      descripcion: request.descripcion.trim(),

      monto: request.monto,

      medioPago: request.medioPago,

      tipoComprobante: request.tipoComprobante,

      fechaComprobante: request.fechaComprobante || undefined,

      serieComprobante: request.serieComprobante?.trim() || undefined,

      numeroComprobante: request.numeroComprobante?.trim() || undefined,

      documentoEmisor: request.documentoEmisor?.trim() || undefined,

      razonSocialEmisor: request.razonSocialEmisor?.trim() || undefined,

      moneda: request.moneda,

      origenRegistro: request.origenRegistro ?? movimientoActual.origenRegistro,

      archivoXmlNombre: request.archivoXmlNombre || undefined,

      hashXml: request.hashXml || undefined,

      observacion: request.observacion?.trim() || undefined,
    };

    this.movimientos[indice] = movimientoActualizado;

    this.notificarCambios();

    return of({
      ...movimientoActualizado,
    });
  }

  obtenerUltimosMovimientos(): Observable<MovimientoResumen[]> {
    return this.listarMovimientos().pipe(
      map((movimientos) =>
        [...movimientos]
          .sort((a, b) => {
            const fecha = b.fechaMovimiento.localeCompare(a.fechaMovimiento);

            if (fecha !== 0) {
              return fecha;
            }

            return b.id - a.id;
          })
          .slice(0, 4)
          .map((movimiento) => ({
            id: movimiento.id,

            fecha: movimiento.fechaMovimiento,

            tipoMovimiento: movimiento.tipoMovimiento,

            categoria: movimiento.categoria,

            descripcion: movimiento.descripcion,

            monto: movimiento.monto,

            estado: 'Registrado',

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
          })),
      ),
    );
  }

  obtenerCategoriasMock(): Observable<string[]> {
    return this.categoriaService
      .listarCategorias()
      .pipe(
        map((categorias) => categorias.map((categoria) => categoria.nombre)),
      );
  }

  private notificarCambios(): void {
    this.movimientosSubject.next(this.copiarMovimientos());
  }

  private copiarMovimientos(): Movimiento[] {
    return this.movimientos.map((movimiento) => ({
      ...movimiento,
    }));
  }

  marcarEgresoComoCancelado(
    movimientoId: number,
    request: CancelarEgresoRequest,
  ): Observable<Movimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const movimiento = this.movimientos.find(
      (item) =>
        item.id === movimientoId && item.empresaId === empresaActualId,
    );

    if (!movimiento) {
      throw new Error('El egreso no existe.');
    }

    if (movimiento.tipoMovimiento !== 2) {
      throw new Error('Solo los egresos pueden marcarse como cancelados.');
    }

    if (movimiento.bCancelado === 1) {
      throw new Error('El egreso ya se encuentra cancelado.');
    }

    movimiento.bCancelado = 1;

    movimiento.cancelado = true;

    movimiento.fechaPago = request.fechaPago;

    movimiento.fechaMovimiento = request.fechaPago;

    this.notificarCambios();

    return of({
      ...movimiento,
    });
  }
}
