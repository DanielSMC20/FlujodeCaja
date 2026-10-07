import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, forkJoin, map, of, take } from 'rxjs';
import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';

import { CategoriaService } from '../../nucleo/servicios/categoria.service';
import { ConfiguracionFinancieraService } from '../../nucleo/servicios/configuracion-financiera.service';
import { AuthService } from '../auth/auth.service';

export const configuracionInicialGuard: CanActivateFn = () => {
  const configuracionService = inject(ConfiguracionFinancieraService);
  const categoriaService = inject(CategoriaService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const sesionUsuarioService = inject(SesionUsuarioService);

  if (authService.requiereCambioPassword()) {
    return router.createUrlTree(['/cuenta/cambiar-password']);
  }

  return forkJoin({
    configuracion: configuracionService.obtenerConfiguracion().pipe(take(1)),
    ingresos: categoriaService.listarCategoriasPorTipo(1).pipe(take(1)),
    egresos: categoriaService.listarCategoriasPorTipo(2).pipe(take(1)),
  }).pipe(
    map(({ configuracion, ingresos, egresos }) => {
      const tieneVentas = ingresos.some(
        (categoria) => categoria.nombre.trim().toLowerCase() === 'ventas',
      );

      const configurado =
        configuracion?.configuracionInicialCompletada === true &&
        tieneVentas &&
        egresos.length > 0;

      if (configurado) {
  return true;
}

if (sesionUsuarioService.esAdministrador) {
  return router.createUrlTree(['/configuracion-inicial']);
}

return router.createUrlTree(['/login']);
    }),
    catchError(() => of(router.createUrlTree(['/configuracion-inicial']))),
  );
};
