import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';

export const gestionMovimientosGuard: CanActivateFn = () => {
  const sesionUsuarioService = inject(SesionUsuarioService);
  const router = inject(Router);

  return sesionUsuarioService.puedeGestionarMovimientos
    ? true
    : router.createUrlTree(['/movimientos']);
};