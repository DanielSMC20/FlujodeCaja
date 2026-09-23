import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import { MovimientoResumen } from '../modelos/dashboard.model';
import {AnularMovimientoRequest,
  CancelarEgresoRequest,
  Movimiento,
  RegistrarMovimientoRequest,
  
} from '../modelos/movimiento';
import { CategoriaService } from './categoria.service';
import { SesionEmpresaService } from './sesion-empresa.service';

interface MovimientoBackendResponse {
  id: number;
  tipoMovimiento: number;
  tipoMovimientoDescripcion?: string | null;
  categoriaId: number;
  categoria: string;
  fechaMovimiento: string;
  fechaProyectada?: string | null;
  fechaPago?: string | null;
  cancelado?: boolean | null;
  descripcion: string;
  monto: number;
  medioPago?: number | null;
  medioPagoDescripcion?: string | null;
  tipoComprobante?: number | null;
  tipoComprobanteDescripcion?: string | null;
  moneda?: number | null;
  monedaDescripcion?: string | null;
  monedaAbreviatura?: string | null;
  origenRegistro?: number | null;
  origenRegistroDescripcion?: string | null;
  observacion?: string | null;
  activo?: boolean | null;
  fechaComprobante?: string | null;
  serieComprobante?: string | null;
  numeroComprobante?: string | null;
  documentoEmisor?: string | null;
  razonSocialEmisor?: string | null;
  archivoXmlNombre?: string | null;
  hashXml?: string | null;
  usuarioRegistroId?: number | null;
  usuarioRegistro?: string | null;
  fechaRegistro?: string | null;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private readonly http = inject(HttpClient);
  private readonly categoriaService = inject(CategoriaService);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  listarMovimientos(tipoMovimiento?: number): Observable<Movimiento[]> {
    let params = new HttpParams().set('soloActivos', 'true');

    if (tipoMovimiento) {
      params = params.set('tipoMovimiento', String(tipoMovimiento));
    }

    return this.http
      .get<MovimientoBackendResponse[]>(`${API_CONFIG.baseUrl}/movimientos`, {
        params,
      })
      .pipe(
        map((movimientos) => movimientos.map((item) => this.mapearMovimiento(item))),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  obtenerMovimientoPorId(id: number): Observable<Movimiento | null> {
    return this.http
      .get<MovimientoBackendResponse>(`${API_CONFIG.baseUrl}/movimientos/${id}`)
      .pipe(
        map((movimiento) => this.mapearMovimiento(movimiento)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return [null];
          }

          return throwError(() => new Error(this.obtenerMensajeError(error)));
        }),
      );
  }
  

  registrarMovimiento(
    request: RegistrarMovimientoRequest,
  ): Observable<Movimiento> {
    return this.http
      .post<MovimientoBackendResponse>(
        `${API_CONFIG.baseUrl}/movimientos`,
        this.construirPayloadRegistro(request),
      )
      .pipe(
        map((response) => this.mapearMovimiento(response)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  actualizarMovimiento(
    id: number,
    request: RegistrarMovimientoRequest,
  ): Observable<Movimiento> {
    return this.http
      .put<MovimientoBackendResponse>(
        `${API_CONFIG.baseUrl}/movimientos/${id}`,
        {
          categoriaId: request.categoriaId,
          fechaMovimiento: request.fechaMovimiento || null,
          fechaProyectada: request.fechaProyectada || null,
          descripcion: request.descripcion.trim(),
          monto: Number(request.monto),
          medioPago: request.medioPago ?? null,
          tipoComprobante: request.tipoComprobante ?? null,
          moneda: request.moneda ?? 1,
          observacion: request.observacion?.trim() || null,
          fechaComprobante: request.fechaComprobante || null,
          serieComprobante: request.serieComprobante?.trim() || null,
          numeroComprobante: request.numeroComprobante?.trim() || null,
          documentoEmisor: request.documentoEmisor?.trim() || null,
          razonSocialEmisor: request.razonSocialEmisor?.trim() || null,
          archivoXmlNombre: request.archivoXmlNombre?.trim() || null,
          hashXml: request.hashXml?.trim() || null,
        },
      )
      .pipe(
        map((response) => this.mapearMovimiento(response)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  marcarEgresoComoCancelado(
    movimientoId: number,
    request: CancelarEgresoRequest,
  ): Observable<Movimiento> {
    return this.http
      .patch<MovimientoBackendResponse>(
        `${API_CONFIG.baseUrl}/movimientos/${movimientoId}/pagar`,
        {
          fechaPago: request.fechaPago,
        },
      )
      .pipe(
        map((response) => this.mapearMovimiento(response)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }
anularMovimiento(
  movimientoId: number,
  request: AnularMovimientoRequest,
): Observable<void> {
  return this.http
    .patch<void>(
      `${API_CONFIG.baseUrl}/movimientos/${movimientoId}/anular`,
      {
        motivo: request.motivo.trim(),
      },
    )
    .pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(
          () => new Error(this.obtenerMensajeError(error)),
        ),
      ),
    );
}

  obtenerUltimosMovimientos(): Observable<MovimientoResumen[]> {
    return this.listarMovimientos().pipe(
      map((movimientos) =>
        [...movimientos]
          .sort((a, b) => {
            const fecha = b.fechaMovimiento.localeCompare(a.fechaMovimiento);
            return fecha !== 0 ? fecha : b.id - a.id;
          })
          .slice(0, 4)
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
          })),
      ),
    );
  }

  obtenerCategoriasMock(): Observable<string[]> {
    return this.categoriaService
      .listarCategorias()
      .pipe(map((categorias) => categorias.map((categoria) => categoria.nombre)));
  }

  private construirPayloadRegistro(request: RegistrarMovimientoRequest) {
    const cancelado: boolean | null =
      request.tipoMovimiento === 2
        ? request.cancelado ?? request.bCancelado === 1
        : null;

    return {
      tipoMovimiento: request.tipoMovimiento,
      categoriaId: request.categoriaId,
      fechaMovimiento: request.fechaMovimiento || null,
      fechaProyectada:
        request.tipoMovimiento === 2 && cancelado === false
          ? request.fechaProyectada || request.fechaMovimiento || null
          : request.fechaProyectada || null,
      fechaPago:
        request.tipoMovimiento === 2 && cancelado === true
          ? request.fechaPago || request.fechaMovimiento || null
          : request.fechaPago || null,
      cancelado,
      descripcion: request.descripcion.trim(),
      monto: Number(request.monto),
      medioPago: request.medioPago ?? null,
      tipoComprobante: request.tipoComprobante ?? null,
      moneda: request.moneda ?? 1,
      observacion: request.observacion?.trim() || null,
      fechaComprobante: request.fechaComprobante || null,
      serieComprobante: request.serieComprobante?.trim() || null,
      numeroComprobante: request.numeroComprobante?.trim() || null,
      documentoEmisor: request.documentoEmisor?.trim() || null,
      razonSocialEmisor: request.razonSocialEmisor?.trim() || null,
      archivoXmlNombre: request.archivoXmlNombre?.trim() || null,
      hashXml: request.hashXml?.trim() || null,
    };
  }

  private mapearMovimiento(response: MovimientoBackendResponse): Movimiento {
    const cancelado = response.cancelado ?? true;

    return {
      id: response.id,
      empresaId: this.sesionEmpresaService.empresaActualId,
      tipoMovimiento: response.tipoMovimiento,
      tipoMovimientoDescripcion: response.tipoMovimientoDescripcion ?? undefined,
      categoriaId: response.categoriaId,
      categoria: response.categoria,
      fechaMovimiento: response.fechaMovimiento,
      fechaProyectada: response.fechaProyectada ?? null,
      fechaPago: response.fechaPago ?? null,
      bCancelado: cancelado ? 1 : 0,
      cancelado,
      descripcion: response.descripcion,
      monto: Number(response.monto),
      medioPago: response.medioPago ?? 9,
      medioPagoDescripcion: response.medioPagoDescripcion ?? undefined,
      tipoComprobante: response.tipoComprobante ?? 5,
      tipoComprobanteDescripcion: response.tipoComprobanteDescripcion ?? undefined,
      moneda: response.moneda ?? 1,
      monedaDescripcion: response.monedaDescripcion ?? undefined,
      monedaAbreviatura: response.monedaAbreviatura ?? undefined,
      origenRegistro: response.origenRegistro ?? 1,
      origenRegistroDescripcion: response.origenRegistroDescripcion ?? undefined,
      observacion: response.observacion ?? null,
      activo: response.activo ?? true,
      fechaComprobante: response.fechaComprobante ?? null,
      serieComprobante: response.serieComprobante ?? null,
      numeroComprobante: response.numeroComprobante ?? null,
      documentoEmisor: response.documentoEmisor ?? null,
      razonSocialEmisor: response.razonSocialEmisor ?? null,
      archivoXmlNombre: response.archivoXmlNombre ?? null,
      hashXml: response.hashXml ?? null,
      usuarioRegistro: response.usuarioRegistro ?? null,
      fechaRegistro: response.fechaRegistro ?? null,
    };
  }
  

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const apiError = error.error as ApiErrorResponse | null;

    if (apiError?.message) {
      return apiError.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    return 'No se pudo procesar el movimiento.';
  }
}
