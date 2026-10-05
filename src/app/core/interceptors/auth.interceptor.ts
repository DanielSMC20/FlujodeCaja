import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';

import { inject } from '@angular/core';

import { catchError, tap, throwError } from 'rxjs';

import { PlataformaAuthService } from '../../administracion/servicios/plataforma-auth.service';

import { AuthService } from '../auth/auth.service';

import { API_CONFIG } from '../config/api.config';

function isBackendRequest(url: string): boolean {
  return url.startsWith('/api/') || url.startsWith(API_CONFIG.baseUrl);
}

function isPlataformaRequest(url: string): boolean {
  return url.includes('/plataforma/');
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  const plataformaAuthService = inject(PlataformaAuthService);

  const backendRequest = isBackendRequest(request.url);

  if (!backendRequest) {
    return next(request);
  }

  const plataformaRequest = isPlataformaRequest(request.url);

  /*
   * LOGIN DE PLATAFORMA
   *
   * Todavía no existe token,
   * por lo tanto simplemente
   * dejamos pasar la petición.
   */
  const esLoginPlataforma = request.url.includes('/plataforma/auth/login');

  if (esLoginPlataforma) {
    return next(request);
  }

  /*
   * ADMINISTRACIÓN SaaS
   */
  if (plataformaRequest) {
    const tokenPlataforma = plataformaAuthService.getToken();

    if (!tokenPlataforma) {
      return next(request);
    }

    const requestPlataforma = request.clone({
      setHeaders: {
        Authorization: `Bearer ${tokenPlataforma}`,
      },
    });

    return next(requestPlataforma).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          plataformaAuthService.logout(true);
        }

        return throwError(() => error);
      }),
    );
  }

  /*
   * SISTEMA NORMAL
   */

  const token = authService.getToken();

  authService.markBackendHit();

  if (!token) {
    return next(request);
  }

  const authRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authRequest).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const tokenRenovado = event.headers.get('X-Access-Token');

        if (tokenRenovado) {
          authService.actualizarTokenRenovado(tokenRenovado);
        }
      }
    }),

    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout(true);
      }

      return throwError(() => error);
    }),
  );
};
