import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  map,
  of,
  startWith,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import {
  ActualizarCategoriaRequest,
  CategoriaMovimiento,
  RegistrarCategoriaRequest,
} from '../modelos/categoria-movimiento';
import { SesionEmpresaService } from './sesion-empresa.service';

interface CategoriaBackendResponse {
  id: number;
  tipoMovimiento: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly refrescarSubject = new Subject<void>();
  private cacheCategorias: CategoriaMovimiento[] = [];

  listarCategorias(): Observable<CategoriaMovimiento[]> {
    return this.refrescarSubject.pipe(
      startWith(void 0),
      switchMap(() => this.listarDesdeBackend(undefined, false)),
      tap((categorias) => {
        this.cacheCategorias = categorias.map((categoria) => ({ ...categoria }));
      }),
    );
  }

  listarCategoriasPorTipo(
    tipoMovimiento: number,
  ): Observable<CategoriaMovimiento[]> {
    return this.refrescarSubject.pipe(
      startWith(void 0),
      switchMap(() => this.listarDesdeBackend(tipoMovimiento, true)),
      tap((categorias) => {
        this.actualizarCacheParcial(categorias, tipoMovimiento);
      }),
    );
  }

  obtenerCategoriaPorId(id: number): CategoriaMovimiento | undefined {
    const categoria = this.cacheCategorias.find((item) => item.id === id);
    return categoria ? { ...categoria } : undefined;
  }

  registrarCategoria(
    request: RegistrarCategoriaRequest,
  ): Observable<CategoriaMovimiento> {
    return this.http
      .post<CategoriaBackendResponse>(`${API_CONFIG.baseUrl}/categorias`, {
        tipoMovimiento: request.tipoMovimiento,
        nombre: request.nombre.trim(),
        descripcion: request.descripcion?.trim() || null,
      })
      .pipe(
        map((response) => this.mapearCategoria(response)),
        tap(() => this.refrescarSubject.next()),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  actualizarCategoria(
    id: number,
    request: ActualizarCategoriaRequest,
  ): Observable<CategoriaMovimiento> {
    return this.obtenerCategoriaParaModificar(id).pipe(
      switchMap((categoriaActual) =>
        this.http.put<CategoriaBackendResponse>(
          `${API_CONFIG.baseUrl}/categorias/${id}`,
          {
            nombre: request.nombre.trim(),
            descripcion: request.descripcion?.trim() || null,
            activo: categoriaActual.estado,
          },
        ),
      ),
      map((response) => this.mapearCategoria(response)),
      tap(() => this.refrescarSubject.next()),
      catchError((error: HttpErrorResponse | Error) =>
        throwError(() =>
          error instanceof HttpErrorResponse
            ? new Error(this.obtenerMensajeError(error))
            : error,
        ),
      ),
    );
  }

  cambiarEstado(id: number): Observable<CategoriaMovimiento> {
    return this.obtenerCategoriaParaModificar(id).pipe(
      switchMap((categoriaActual) =>
        this.http.put<CategoriaBackendResponse>(
          `${API_CONFIG.baseUrl}/categorias/${id}`,
          {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion || null,
            activo: !categoriaActual.estado,
          },
        ),
      ),
      map((response) => this.mapearCategoria(response)),
      tap(() => this.refrescarSubject.next()),
      catchError((error: HttpErrorResponse | Error) =>
        throwError(() =>
          error instanceof HttpErrorResponse
            ? new Error(this.obtenerMensajeError(error))
            : error,
        ),
      ),
    );
  }

  private obtenerCategoriaParaModificar(
    id: number,
  ): Observable<CategoriaMovimiento> {
    const cache = this.cacheCategorias.find((categoria) => categoria.id === id);

    if (cache) {
      return of({ ...cache });
    }

    return this.listarDesdeBackend(undefined, false).pipe(
      switchMap((categorias) => {
        this.cacheCategorias = categorias.map((categoria) => ({ ...categoria }));
        const categoria = categorias.find((item) => item.id === id);

        return categoria
          ? of(categoria)
          : throwError(() => new Error('La categoría no existe.'));
      }),
    );
  }

  private listarDesdeBackend(
    tipoMovimiento?: number,
    soloActivos = true,
  ): Observable<CategoriaMovimiento[]> {
    let params = new HttpParams().set('soloActivos', String(soloActivos));

    if (tipoMovimiento) {
      params = params.set('tipoMovimiento', String(tipoMovimiento));
    }

    return this.http
      .get<CategoriaBackendResponse[]>(`${API_CONFIG.baseUrl}/categorias`, {
        params,
      })
      .pipe(
        map((categorias) => categorias.map((item) => this.mapearCategoria(item))),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  private mapearCategoria(response: CategoriaBackendResponse): CategoriaMovimiento {
    return {
      id: response.id,
      empresaId: this.sesionEmpresaService.empresaActualId,
      nombre: response.nombre,
      tipoMovimiento: response.tipoMovimiento,
      descripcion: response.descripcion ?? '',
      estado: response.activo,
    };
  }

  private actualizarCacheParcial(
    categorias: CategoriaMovimiento[],
    tipoMovimiento: number,
  ): void {
    const otras = this.cacheCategorias.filter(
      (categoria) => categoria.tipoMovimiento !== tipoMovimiento,
    );

    this.cacheCategorias = [
      ...otras,
      ...categorias.map((categoria) => ({ ...categoria })),
    ];
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const apiError = error.error as ApiErrorResponse | null;

    if (apiError?.message) {
      return apiError.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    return 'No se pudo procesar la categoría.';
  }
}
