import { Routes } from '@angular/router';
import { gestionMovimientosGuard } from './core/guards/gestion-movimientos.guard';
import { EstructuraPrincipalComponent } from './estructura/estructura-principal/estructura-principal.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { administradorGuard } from './core/guards/administrador.guard';
import {  plataformaAuthGuard,} from '../app/core/guards/plataforma-auth.guard';
import { cambioPasswordObligatorioGuard } from './core/guards/cambio-password-obligatorio.guard';

export const routes: Routes = [

  {
  path:
    'administracion/login',

  loadComponent: () =>
    import(
      './administracion/paginas/login-administracion/login-administracion.component'
    )
      .then(
        (component) =>
          component
            .LoginAdministracionComponent,
      ),
},


{
  path:
    'administracion',

  canActivate: [
    plataformaAuthGuard,
  ],

  canActivateChild: [
    plataformaAuthGuard,
  ],

  loadComponent: () =>
    import(
      './administracion/estructura/administracion-layout/administracion-layout.component'
    )
      .then(
        (component) =>
          component
            .AdministracionLayoutComponent,
      ),

  children: [

    {
      path: '',

      pathMatch:
        'full',

      redirectTo:
        'empresas',
    },


    {
      path:
        'empresas',

      loadComponent: () =>
        import(
          './administracion/paginas/empresas/lista-empresas/lista-empresas.component'
        )
          .then(
            (component) =>
              component
                .ListaEmpresasComponent,
          ),
    },


    {
      path:
        'empresas/nueva',

      loadComponent: () =>
        import(
          './administracion/paginas/empresas/nueva-empresa/nueva-empresa.component'
        )
          .then(
            (component) =>
              component
                .NuevaEmpresaComponent,
          ),
    },


    {
      path:
        'empresas/:id',

      loadComponent: () =>
        import(
          './administracion/paginas/empresas/detalle-empresa/detalle-empresa.component'
        )
          .then(
            (component) =>
              component
                .DetalleEmpresaComponent,
          ),
    },
  ],
},
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
    path: 'recuperar-password',
    loadComponent: () =>
      import('./features/recuperar-password/recuperar-password.component').then(
        (component) => component.RecuperarPasswordComponent,
      ),
  },
  {
    path: 'restablecer-password',
    loadComponent: () =>
      import('./features/restablecer-password/restablecer-password.component').then(
        (component) => component.RestablecerPasswordComponent,
      ),
  },

  {
    path: 'cuenta/cambiar-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cambiar-password/cambiar-password.component').then(
        (component) => component.CambiarPasswordComponent,
      ),
  },
{
  path: '',
  component: EstructuraPrincipalComponent,
  canActivate: [
    authGuard,
    cambioPasswordObligatorioGuard
  ],
  canActivateChild: [
    authGuard,
    cambioPasswordObligatorioGuard
  ],
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
            canActivate: [gestionMovimientosGuard],
            loadComponent: () =>
              import('./modulos/movimientos/paginas/formulario-movimiento/formulario-movimiento.component').then(
                (component) => component.FormularioMovimientoComponent,
              ),
          },
          {
            path: 'egresos-masivos',
            canActivate: [gestionMovimientosGuard],
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
            canActivate: [gestionMovimientosGuard],
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

        children: [
          {
            path: '',

            loadComponent: () =>
              import('./modulos/reportes/paginas/reportes/reportes.component').then(
                (component) => component.ReportesComponent,
              ),
          },

          {
            path: 'compras',

            loadComponent: () =>
              import('./modulos/reportes/paginas/registro-compras/registro-compras.component').then(
                (component) => component.RegistroComprasComponent,
              ),
          },
        ],
      },
      {
        path: 'categorias',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./modulos/categorias/paginas/lista-categorias/lista-categorias.component').then(
            (component) => component.ListaCategoriasComponent,
          ),
      },

      {
        path: 'configuracion/usuarios',

        canActivate: [administradorGuard],

        loadComponent: () =>
          import('./modulos/configuracion/paginas/usuarios/usuarios.component').then(
            (component) => component.UsuariosComponent,
          ),
      },
      {
        path: 'configuracion/usuarios/nuevo',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./modulos/configuracion/paginas/crear-cuenta-empresa/crear-cuenta-empresa.component').then(
            (component) => component.CrearCuentaEmpresaComponent,
          ),
      },

      {
        path: 'configuracion',
        canActivate: [administradorGuard],
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
