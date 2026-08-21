import {
  Injectable,
} from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  of,
} from 'rxjs';

import {
  ActualizarConfiguracionFinancieraRequest,
  ConfiguracionFinanciera,
} from '../modelos/configuracion-financiera.model';


@Injectable({
  providedIn: 'root',
})
export class ConfiguracionFinancieraService {

  private readonly configuracionSubject =
    new BehaviorSubject<ConfiguracionFinanciera>({
      empresaId: 1,
      saldoInicial: 2500,
      fechaSaldoInicial: '2026-07-01',
      moneda: 1,
    });


  readonly configuracion$ =
    this.configuracionSubject
      .asObservable();


  obtenerConfiguracion():
    Observable<ConfiguracionFinanciera> {

    return this.configuracion$;

  }


  actualizarConfiguracion(
    request:
      ActualizarConfiguracionFinancieraRequest,
  ): Observable<ConfiguracionFinanciera> {

    const configuracion:
      ConfiguracionFinanciera = {

      empresaId:
        1,

      saldoInicial:
        Number(
          request.saldoInicial,
        ),

      fechaSaldoInicial:
        request.fechaSaldoInicial,

      moneda:
        request.moneda,

    };


    this.configuracionSubject
      .next(
        configuracion,
      );


    return of({
      ...configuracion,
    });

  }

}