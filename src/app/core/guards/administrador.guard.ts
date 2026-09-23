import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';

export const administradorGuard: CanActivateFn = () => {
  const sesionUsuarioService = inject(SesionUsuarioService);
  const router = inject(Router);

  return sesionUsuarioService.esAdministrador
    ? true
    : router.createUrlTree(['/inicio']);
};