import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

const API_PREFIX = '/api';

function isBackendRequest(url: string): boolean {
  return url.startsWith(API_PREFIX) || /^https?:\/\//i.test(url);
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
      Authorization: `Bearer ${token}`
    }
  });

  return next(authRequest);
};
