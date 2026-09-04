import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ConfiguracionFinancieraService } from '../../nucleo/servicios/configuracion-financiera.service';

export const configuracionInicialGuard: CanActivateFn = () => {
  const configuracionService = inject(ConfiguracionFinancieraService);
  const router = inject(Router);

  if (configuracionService.tieneConfiguracionInicial()) {
    return true;
  }

  return router.createUrlTree(['/configuracion-inicial']);
};
