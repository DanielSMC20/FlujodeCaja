import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';
import {
  ActualizarConfiguracionFinancieraRequest,
  ConfiguracionFinanciera,
} from '../modelos/configuracion-financiera.model';
import { SesionEmpresaService } from './sesion-empresa.service';

interface SaldoAperturaBackendResponse {
  configurado: boolean;
  saldoInicial: number | null;
  fechaApertura: string | null;
  moneda: number;
  monedaDescripcion: string;
  usuarioRegistroId: number | null;
  fechaRegistro: string | null;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionFinancieraService {
  private readonly http = inject(HttpClient);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);
  private empresaConfiguracionCacheId: number | null = null;
  private readonly configuracionSubject =
    new BehaviorSubject<ConfiguracionFinanciera | null>(null);

  readonly configuracion$ = this.configuracionSubject.asObservable();

obtenerConfiguracion(): Observable<ConfiguracionFinanciera | null> {
  const empresaId = this.sesionEmpresaService.empresaActualId;
  const configuracionActual = this.configuracionSubject.value;

  if (
    configuracionActual &&
    empresaId > 0 &&
    this.empresaConfiguracionCacheId === empresaId
  ) {
    return of({ ...configuracionActual });
  }

  return this.http
    .get<SaldoAperturaBackendResponse>(
      `${API_CONFIG.baseUrl}/saldo-apertura`,
    )
    .pipe(
      map((response) => this.mapearConfiguracion(response)),
      tap((configuracion) => {
        this.empresaConfiguracionCacheId = empresaId;
        this.configuracionSubject.next(configuracion);
      }),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(this.obtenerMensajeError(error))),
      ),
    );
}

  verificarConfiguracionInicial(): Observable<boolean> {
    return this.obtenerConfiguracion().pipe(
      map((configuracion) => configuracion?.configuracionInicialCompletada === true),
    );
  }

  tieneConfiguracionInicial(): boolean {
    return this.configuracionSubject.value?.configuracionInicialCompletada === true;
  }

  obtenerConfiguracionActual(): ConfiguracionFinanciera | null {
    const configuracion = this.configuracionSubject.value;
    return configuracion ? { ...configuracion } : null;
  }

  actualizarConfiguracion(
    request: ActualizarConfiguracionFinancieraRequest,
  ): Observable<ConfiguracionFinanciera> {
    const guardar$ = () =>
      this.http
        .post<SaldoAperturaBackendResponse>(`${API_CONFIG.baseUrl}/saldo-apertura`, {
          saldoInicial: Number(request.saldoInicial),
        })
        .pipe(
          map((response) => {
            const configuracion = this.mapearConfiguracion(response);

            if (!configuracion) {
              throw new Error('El backend no confirmó el saldo inicial.');
            }

            return configuracion;
          }),
        );

    return this.obtenerConfiguracion().pipe(
      switchMap((actual) => {
        if (actual?.configuracionInicialCompletada) {
          return of(actual);
        }

        return guardar$();
      }),
tap((configuracion) => {
  this.empresaConfiguracionCacheId =
    this.sesionEmpresaService.empresaActualId;

  this.configuracionSubject.next(configuracion);
}),      catchError((error: unknown) => {
        if (error instanceof Error) {
          return throwError(() => error);
        }

        return throwError(
          () => new Error('No se pudo registrar el saldo inicial.'),
        );
      }),
    );
  }

limpiarCache(): void {
  this.empresaConfiguracionCacheId = null;
  this.configuracionSubject.next(null);
}

  private mapearConfiguracion(
    response: SaldoAperturaBackendResponse,
  ): ConfiguracionFinanciera | null {
    if (!response.configurado) {
      return null;
    }

    return {
      empresaId: this.sesionEmpresaService.empresaActualId,
      saldoInicial: Number(response.saldoInicial ?? 0),
      fechaSaldoInicial: response.fechaApertura ?? '',
      moneda: response.moneda ?? 1,
      configuracionInicialCompletada: true,
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

    return 'No se pudo consultar la configuración financiera.';
  }
}
