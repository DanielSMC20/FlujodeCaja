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
      categoria: 'Venta en barra',
      fechaMovimiento: '2026-08-19',
      descripcion: 'Ventas del miércoles',
      monto: 2850,
      medioPago: 2,
      tipoComprobante: 2,
      fechaComprobante: '2026-08-19',
      serieComprobante: 'B001',
      numeroComprobante: '00000842',
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 1,
      cancelado: true,
      observacion: 'Cierre de caja y POS',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-19T23:10:00',
    },
    {
      id: 2,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 5,
      categoria: 'Seguridad',
      fechaMovimiento: '2026-08-19',
      fechaPago: '2026-08-19',
      descripcion: 'Servicio de seguridad',
      monto: 680,
      medioPago: 2,
      tipoComprobante: 1,
      fechaComprobante: '2026-08-19',
      serieComprobante: 'F001',
      numeroComprobante: '00000418',
      documentoEmisor: '20601234567',
      razonSocialEmisor: 'Seguridad del Sur S.A.C.',
      moneda: 1,
      origenRegistro: 2,
      archivoXmlNombre: 'factura-seguridad.xml',
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-19T18:05:00',
    },
    {
      id: 3,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 2,
      categoria: 'Entradas',
      fechaMovimiento: '2026-08-18',
      descripcion: 'Entradas preventa',
      monto: 4200,
      medioPago: 2,
      tipoComprobante: 2,
      fechaComprobante: '2026-08-18',
      serieComprobante: 'B001',
      numeroComprobante: '00000831',
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-18T21:30:00',
    },
    {
      id: 4,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 6,
      categoria: 'Bebidas e insumos',
      fechaMovimiento: '2026-08-18',
      fechaPago: '2026-08-18',
      descripcion: 'Reposición semanal',
      monto: 1320,
      medioPago: 2,
      tipoComprobante: 1,
      fechaComprobante: '2026-08-18',
      serieComprobante: 'F015',
      numeroComprobante: '00001204',
      documentoEmisor: '20577889911',
      razonSocialEmisor: 'Distribuidora Costa Sur S.A.C.',
      moneda: 1,
      origenRegistro: 2,
      archivoXmlNombre: 'factura-insumos.xml',
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-18T15:15:00',
    },
    {
      id: 5,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 3,
      categoria: 'Reservas',
      fechaMovimiento: '2026-08-17',
      descripcion: 'Reservas de mesas VIP',
      monto: 1950,
      medioPago: 2,
      tipoComprobante: 5,
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-17T19:30:00',
    },
    {
      id: 6,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 1,
      categoria: 'Venta en barra',
      fechaMovimiento: '2026-08-17',
      descripcion: 'Ventas del lunes',
      monto: 2100,
      medioPago: 1,
      tipoComprobante: 2,
      fechaComprobante: '2026-08-17',
      serieComprobante: 'B001',
      numeroComprobante: '00000815',
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-17T23:00:00',
    },
    {
      id: 7,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 4,
      categoria: 'DJ / Artistas',
      fechaMovimiento: '2026-08-21',
      fechaProyectada: '2026-08-21',
      descripcion: 'Presentación fin de semana',
      monto: 2200,
      medioPago: 2,
      tipoComprobante: 5,
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 0,
      cancelado: false,
      observacion: 'Producciones Delta',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-17T17:00:00',
    },
    {
      id: 8,
      empresaId: 1,
      tipoMovimiento: 1,
      categoriaId: 1,
      categoria: 'Venta en barra',
      fechaMovimiento: '2026-08-15',
      descripcion: 'Ventas del sábado',
      monto: 4700,
      medioPago: 2,
      tipoComprobante: 2,
      fechaComprobante: '2026-08-15',
      serieComprobante: 'B001',
      numeroComprobante: '00000794',
      moneda: 1,
      origenRegistro: 1,
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-15T23:35:00',
    },
    {
      id: 9,
      empresaId: 1,
      tipoMovimiento: 2,
      categoriaId: 8,
      categoria: 'Servicios básicos',
      fechaMovimiento: '2026-08-16',
      fechaPago: '2026-08-16',
      descripcion: 'Internet del local',
      monto: 430,
      medioPago: 2,
      tipoComprobante: 1,
      fechaComprobante: '2026-08-16',
      serieComprobante: 'F001',
      numeroComprobante: '00002155',
      documentoEmisor: '20100017491',
      razonSocialEmisor: 'Telecomunicaciones del Perú S.A.',
      moneda: 1,
      origenRegistro: 2,
      archivoXmlNombre: 'internet-agosto.xml',
      bCancelado: 1,
      cancelado: true,
      observacion: '',
      usuarioRegistro: 'Daniel Mitma',
      fechaRegistro: '2026-08-16T10:30:00',
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
        ? request.bCancelado ?? movimientoActual.bCancelado ?? 1
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

            origen: movimiento.origenRegistro === 2 ? 'XML' : 'Manual',

            medioPago:
              movimiento.medioPago === 2 ? 'Transferencia' : 'Efectivo',
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
    const movimiento = this.movimientos.find(
      (item) => item.id === movimientoId,
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

    movimiento.medioPago = request.medioPago;

    movimiento.observacion = request.observacion;

    this.movimientosSubject.next([...this.movimientos]);

    return of({
      ...movimiento,
    });
  }
}
