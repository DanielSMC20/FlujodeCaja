import { Routes } from '@angular/router';

import { EstructuraPrincipalComponent } from './estructura/estructura-principal/estructura-principal.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { configuracionInicialGuard } from './core/guards/configuracion-inicial.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'configuracion-inicial',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modulos/configuracion/paginas/configuracion-inicial/configuracion-inicial.component').then(
        (component) => component.ConfiguracionInicialComponent,
      ),
  },
  {
    path: '',
    component: EstructuraPrincipalComponent,
    canActivate: [authGuard, configuracionInicialGuard],
    canActivateChild: [authGuard, configuracionInicialGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./modulos/panel-principal/paginas/panel-principal/panel-principal.component').then(
            (component) => component.PanelPrincipalComponent,
          ),
      },
      {
        path: 'movimientos',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./modulos/movimientos/paginas/lista-movimientos/lista-movimientos.component').then(
                (component) => component.ListaMovimientosComponent,
              ),
          },
          {
            path: 'nuevo',
            loadComponent: () =>
              import('./modulos/movimientos/paginas/formulario-movimiento/formulario-movimiento.component').then(
                (component) => component.FormularioMovimientoComponent,
              ),
          },
          {
            path: 'egresos-masivos',
            loadComponent: () =>
              import('./modulos/movimientos/paginas/carga-masiva-movimientos/carga-masiva-movimientos.component').then(
                (component) => component.CargaMasivaMovimientosComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./modulos/movimientos/paginas/detalle-movimiento/detalle-movimiento.component').then(
                (component) => component.DetalleMovimientoComponent,
              ),
          },
          {
            path: ':id/editar',
            loadComponent: () =>
              import('./modulos/movimientos/paginas/formulario-movimiento/formulario-movimiento.component').then(
                (component) => component.FormularioMovimientoComponent,
              ),
          },
        ],
      },
      {
        path: 'flujo-caja',
        loadComponent: () =>
          import('./modulos/flujo-caja/paginas/flujo-caja/flujo-caja.component').then(
            (component) => component.FlujoCajaComponent,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./modulos/reportes/paginas/reportes/reportes.component').then(
            (component) => component.ReportesComponent,
          ),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./modulos/categorias/paginas/lista-categorias/lista-categorias.component').then(
            (component) => component.ListaCategoriasComponent,
          ),
      },
      {
        path: 'configuracion/usuarios/nuevo',
        loadComponent: () =>
          import('./modulos/configuracion/paginas/crear-cuenta-empresa/crear-cuenta-empresa.component').then(
            (component) => component.CrearCuentaEmpresaComponent,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./modulos/configuracion/paginas/configuracion/configuracion.component').then(
            (component) => component.ConfiguracionComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
