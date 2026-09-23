import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { API_CONFIG } from '../../core/config/api.config';

interface MiCuentaResponse {
  usuarioId: number;
  correo: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  debeCambiarPassword: boolean;
}

interface ApiErrorResponse {
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CuentaUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  cambiarPassword(
    passwordActual: string,
    nuevaPassword: string,
    confirmarPassword: string,
  ): Observable<MiCuentaResponse> {
    return this.http
      .patch<MiCuentaResponse>(`${API_CONFIG.baseUrl}/cuenta/password`, {
        passwordActual,
        nuevaPassword,
        confirmarPassword,
      })
      .pipe(
        tap(() => this.authService.marcarPasswordActualizado()),
        catchError((error: HttpErrorResponse) => {
          const mensaje = (error.error as ApiErrorResponse | null)?.message;
          return throwError(
            () =>
              new Error(
                mensaje ||
                  (error.status === 0
                    ? 'No se pudo conectar con el servidor.'
                    : 'No se pudo actualizar la contraseña.'),
              ),
          );
        }),
      );
  }
}
