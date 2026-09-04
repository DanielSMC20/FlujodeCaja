import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, forkJoin, map, of, take } from 'rxjs';

import { CategoriaService } from '../../nucleo/servicios/categoria.service';
import { ConfiguracionFinancieraService } from '../../nucleo/servicios/configuracion-financiera.service';

export const configuracionInicialGuard: CanActivateFn = () => {
  const configuracionService = inject(ConfiguracionFinancieraService);
  const categoriaService = inject(CategoriaService);
  const router = inject(Router);

  return forkJoin({
    configuracion: configuracionService.obtenerConfiguracion().pipe(take(1)),
    ingresos: categoriaService.listarCategoriasPorTipo(1).pipe(take(1)),
    egresos: categoriaService.listarCategoriasPorTipo(2).pipe(take(1)),
  }).pipe(
    map(({ configuracion, ingresos, egresos }) => {
      const configurado =
        configuracion?.configuracionInicialCompletada === true &&
        ingresos.length > 0 &&
        egresos.length > 0;

      return configurado
        ? true
        : router.createUrlTree(['/configuracion-inicial']);
    }),
    catchError(() => of(router.createUrlTree(['/configuracion-inicial']))),
  );
};
