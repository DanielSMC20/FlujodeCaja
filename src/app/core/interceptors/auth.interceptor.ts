import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';

import { inject } from '@angular/core';

import { catchError, tap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

import { API_CONFIG } from '../config/api.config';

function isBackendRequest(url: string): boolean {
  return url.startsWith('/api/') || url.startsWith(API_CONFIG.baseUrl);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  const token = authService.getToken();

  const backendRequest = isBackendRequest(request.url);

  if (backendRequest) {
    authService.markBackendHit();
  }

  if (!backendRequest || !token) {
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
