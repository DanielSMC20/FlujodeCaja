import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
  catchError,
  throwError,
} from 'rxjs';

import {
  API_CONFIG,
} from '../../core/config/api.config';

import {
  ActualizarEmpresaPlataformaRequest,
  CrearEmpresaPlataformaRequest,
  EmpresaPlataforma,
} from '../modelos/empresa-plataforma.model';


interface ApiErrorResponse {
  message?: string;
}


@Injectable({
  providedIn:
    'root',
})
export class PlataformaEmpresaService {

  private readonly http =
    inject(
      HttpClient,
    );


  listar(
    busqueda?: string,
  ):
    Observable<EmpresaPlataforma[]> {

    let params =
      new HttpParams();


    const filtro =
      busqueda?.trim();


    if (filtro) {

      params =
        params.set(
          'busqueda',
          filtro,
        );
    }


    return this.http

      .get<EmpresaPlataforma[]>(

        `${API_CONFIG.baseUrl}/plataforma/empresas`,

        {
          params,
        },
      )

      .pipe(

        catchError(
          (error) =>
            this.manejarError(
              error,
            ),
        ),
      );
  }


  obtener(
    empresaId: number,
  ):
    Observable<EmpresaPlataforma> {

    return this.http

      .get<EmpresaPlataforma>(

        `${API_CONFIG.baseUrl}/plataforma/empresas/${empresaId}`,
      )

      .pipe(

        catchError(
          (error) =>
            this.manejarError(
              error,
            ),
        ),
      );
  }


  crear(
    request:
      CrearEmpresaPlataformaRequest,
  ):
    Observable<EmpresaPlataforma> {

    return this.http

      .post<EmpresaPlataforma>(

        `${API_CONFIG.baseUrl}/plataforma/empresas`,

        request,
      )

      .pipe(

        catchError(
          (error) =>
            this.manejarError(
              error,
            ),
        ),
      );
  }


  actualizar(

    empresaId: number,

    request:
      ActualizarEmpresaPlataformaRequest,

  ):
    Observable<EmpresaPlataforma> {

    return this.http

      .put<EmpresaPlataforma>(

        `${API_CONFIG.baseUrl}/plataforma/empresas/${empresaId}`,

        request,
      )

      .pipe(

        catchError(
          (error) =>
            this.manejarError(
              error,
            ),
        ),
      );
  }


  private manejarError(
    error:
      HttpErrorResponse,
  ):
    Observable<never> {

    const body:
      ApiErrorResponse
      |
      null =
      error.error;


    const mensaje =

      body
        ?.message
        ?.trim()

      ||

      (
        error.status === 0

          ? 'No se pudo conectar con el servidor.'

          : 'No se pudo procesar la operación.'
      );


    return throwError(
      () =>
        new Error(
          mensaje,
        ),
    );
  }
}