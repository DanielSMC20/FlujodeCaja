import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Router } from '@angular/router';

import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { API_CONFIG } from '../../core/config/api.config';

import {
  AdministradorPlataformaSesion,
  PlataformaLoginResponse,
} from '../modelos/plataforma-auth.model';

interface ApiErrorResponse {
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlataformaAuthService {
  private readonly http = inject(HttpClient);

  private readonly router = inject(Router);

  private readonly tokenKey = 'fc_platform_access_token';

  private readonly expiryKey = 'fc_platform_expires_at';

  private readonly adminKey = 'fc_platform_admin';

  login(correo: string, password: string): Observable<void> {
    return this.http

      .post<PlataformaLoginResponse>(
        `${API_CONFIG.baseUrl}/plataforma/auth/login`,

        {
          correo: correo.trim().toLowerCase(),

          password,
        },
      )

      .pipe(
        tap((response) => {
          const expiresAt = Date.now() + Number(response.expiresIn) * 1000;

          localStorage.setItem(this.tokenKey, response.accessToken);

          localStorage.setItem(this.expiryKey, String(expiresAt));

          localStorage.setItem(
            this.adminKey,
            JSON.stringify(response.administrador),
          );
        }),

        map(() => void 0),

        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }

  logout(redirigir = true): void {
    localStorage.removeItem(this.tokenKey);

    localStorage.removeItem(this.expiryKey);

    localStorage.removeItem(this.adminKey);

    if (redirigir) {
      void this.router.navigateByUrl('/administracion/login');
    }
  }

  getToken(): string | null {
    if (!this.isAuthenticated()) {
      this.logout(false);

      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  getAdministrador(): AdministradorPlataformaSesion | null {
    const raw = localStorage.getItem(this.adminKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AdministradorPlataformaSesion;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);

    const expiresAt = Number(localStorage.getItem(this.expiryKey));

    return !!token && Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const body = error.error as ApiErrorResponse | null;

    if (body?.message?.trim()) {
      return body.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }

    return 'No se pudo iniciar sesión en la administración.';
  }
}
