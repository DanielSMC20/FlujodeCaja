import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

export const cambioPasswordObligatorioGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.requiereCambioPassword()) {
    return router.createUrlTree([
      '/cuenta/cambiar-password'
    ]);
  }

  return true;
};