import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { PlataformaAuthService } from '../../administracion/servicios/plataforma-auth.service';

export const plataformaAuthGuard: CanActivateFn = () => {
  const authService = inject(PlataformaAuthService);

  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/administracion/login']);
};
