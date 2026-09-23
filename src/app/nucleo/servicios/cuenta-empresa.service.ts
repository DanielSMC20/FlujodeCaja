import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
  catchError,
  map,
  throwError,
} from 'rxjs';

import {
  API_CONFIG,
} from '../../core/config/api.config';

import {
  ActualizarCuentaEmpresaRequest,
  CrearCuentaEmpresaRequest,
  CuentaEmpresaCreada,
  RolGestion,
  UsuarioEmpresa,
} from '../modelos/cuenta-empresa.model';

import {
  SesionEmpresaService,
} from './sesion-empresa.service';


interface RolBackendResponse {
  id: number;

  codigo: string;

  nombre: string;

  descripcion: string;
}


interface UsuarioBackendResponse {
  id: number;

  correo: string;

  nombres: string;

  apellidos: string;

  activo: boolean;

  rolId: number;

  rolCodigo: string;

  rolNombre: string;

  fechaRegistro: string;
}


interface ApiErrorResponse {
  message?: string;
}


@Injectable({
  providedIn: 'root',
})
export class CuentaEmpresaService {

  private readonly http =
    inject(HttpClient);

  private readonly sesionEmpresaService =
    inject(SesionEmpresaService);


  listarRoles():
    Observable<RolGestion[]> {

    return this.http
      .get<RolBackendResponse[]>(
        `${API_CONFIG.baseUrl}/usuarios/roles`,
      )
      .pipe(
        map((roles) =>
          roles
            .filter(
              (rol) =>
                rol.codigo !==
                'ADMINISTRADOR',
            )
            .map((rol) => ({
              id: rol.id,

              codigo: rol.codigo,

              nombre: rol.nombre,

              descripcion:
                rol.descripcion,
            })),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  crearCuenta(
    request:
      CrearCuentaEmpresaRequest,
  ): Observable<CuentaEmpresaCreada> {

    return this.http
      .post<UsuarioBackendResponse>(
        `${API_CONFIG.baseUrl}/usuarios`,
        {
          correo:
            request.correo
              .trim()
              .toLowerCase(),

          nombres:
            request.nombres.trim(),

          apellidos:
            request.apellidos.trim(),

          passwordTemporal:
            request.password,

          rolId:
            request.rolId,
        },
      )
      .pipe(
        map(
          (usuario) =>
            this.mapearUsuario(
              usuario,
            ),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  listarUsuarios(
    soloActivos = false,
  ): Observable<UsuarioEmpresa[]> {

    return this.http
      .get<UsuarioBackendResponse[]>(
        `${API_CONFIG.baseUrl}/usuarios`,
        {
          params: {
            soloActivos:
              String(soloActivos),
          },
        },
      )
      .pipe(
        map((usuarios) =>
          usuarios.map(
            (usuario) =>
              this.mapearUsuario(
                usuario,
              ),
          ),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  actualizarUsuario(
    usuarioId: number,

    request:
      ActualizarCuentaEmpresaRequest,
  ): Observable<UsuarioEmpresa> {

    return this.http
      .put<UsuarioBackendResponse>(
        `${API_CONFIG.baseUrl}/usuarios/${usuarioId}`,
        {
          nombres:
            request.nombres.trim(),

          apellidos:
            request.apellidos.trim(),

          rolId:
            request.rolId,
        },
      )
      .pipe(
        map(
          (usuario) =>
            this.mapearUsuario(
              usuario,
            ),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  cambiarEstadoUsuario(
    usuarioId: number,

    activo: boolean,
  ): Observable<UsuarioEmpresa> {

    return this.http
      .patch<UsuarioBackendResponse>(
        `${API_CONFIG.baseUrl}/usuarios/${usuarioId}/estado`,
        {
          activo,
        },
      )
      .pipe(
        map(
          (usuario) =>
            this.mapearUsuario(
              usuario,
            ),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  restablecerPasswordUsuario(
    usuarioId: number,

    nuevaPassword: string,
  ): Observable<UsuarioEmpresa> {

    return this.http
      .patch<UsuarioBackendResponse>(
        `${API_CONFIG.baseUrl}/usuarios/${usuarioId}/password`,
        {
          nuevaPassword,
        },
      )
      .pipe(
        map(
          (usuario) =>
            this.mapearUsuario(
              usuario,
            ),
        ),

        catchError(
          (
            error:
              HttpErrorResponse,
          ) =>
            throwError(
              () =>
                new Error(
                  this.obtenerMensajeError(
                    error,
                  ),
                ),
            ),
        ),
      );
  }


  private mapearUsuario(
    usuario:
      UsuarioBackendResponse,
  ): UsuarioEmpresa {

    return {
      id:
        usuario.id,

      empresaId:
        this.sesionEmpresaService
          .empresaActualId,

      nombres:
        usuario.nombres,

      apellidos:
        usuario.apellidos,

      correo:
        usuario.correo,

      rol: {
        id:
          usuario.rolId,

        codigo:
          usuario.rolCodigo,

        nombre:
          usuario.rolNombre,

        descripcion: '',
      },

      activa:
        usuario.activo,

      fechaRegistro:
        usuario.fechaRegistro,
    };
  }


private obtenerMensajeError(error: HttpErrorResponse): string {

  const mensaje =
    (error.error as ApiErrorResponse | null)?.message;

  if (mensaje) {
    return mensaje;
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta operación.';
  }

  return error.status === 0
    ? 'No se pudo conectar con el servidor.'
    : 'No se pudo procesar la operación de usuario.';
}
}