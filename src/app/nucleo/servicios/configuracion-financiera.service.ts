import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

import {
  ActualizarConfiguracionFinancieraRequest,
  ConfiguracionFinanciera,
} from '../modelos/configuracion-financiera.model';
import { SesionEmpresaService } from './sesion-empresa.service';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionFinancieraService {
  private readonly storagePrefix = 'fc_configuracion_financiera_';

  private readonly configuracionSubject =
    new BehaviorSubject<ConfiguracionFinanciera | null>(null);

  readonly configuracion$ = this.configuracionSubject.asObservable();

  constructor(private readonly sesionEmpresaService: SesionEmpresaService) {
    this.restaurarConfiguracion();
  }

  obtenerConfiguracion(): Observable<ConfiguracionFinanciera | null> {
    return this.configuracion$;
  }

  tieneConfiguracionInicial(): boolean {
    const configuracion = this.obtenerConfiguracionActual();
    return configuracion?.configuracionInicialCompletada === true;
  }

  obtenerConfiguracionActual(): ConfiguracionFinanciera | null {
    const empresaId = this.sesionEmpresaService.empresaActualId;
    const configuracion = this.configuracionSubject.value;

    if (configuracion?.empresaId === empresaId) {
      return { ...configuracion };
    }

    const restaurada = this.leerConfiguracion(empresaId);
    this.configuracionSubject.next(restaurada);
    return restaurada ? { ...restaurada } : null;
  }

  actualizarConfiguracion(
    request: ActualizarConfiguracionFinancieraRequest,
  ): Observable<ConfiguracionFinanciera> {
    const empresaId = this.sesionEmpresaService.empresaActualId;

    const configuracion: ConfiguracionFinanciera = {
      empresaId,
      saldoInicial: Number(request.saldoInicial),
      fechaSaldoInicial: request.fechaSaldoInicial,
      moneda: request.moneda,
      configuracionInicialCompletada: true,
    };

    localStorage.setItem(
      this.obtenerStorageKey(empresaId),
      JSON.stringify(configuracion),
    );

    this.configuracionSubject.next(configuracion);

    return of({ ...configuracion });
  }

  private restaurarConfiguracion(): void {
    const empresaId = this.sesionEmpresaService.empresaActualId;
    this.configuracionSubject.next(this.leerConfiguracion(empresaId));
  }

  private leerConfiguracion(empresaId: number): ConfiguracionFinanciera | null {
    const raw = localStorage.getItem(this.obtenerStorageKey(empresaId));

    if (!raw) {
      return null;
    }

    try {
      const configuracion = JSON.parse(raw) as ConfiguracionFinanciera;

      if (
        configuracion.empresaId !== empresaId ||
        configuracion.configuracionInicialCompletada !== true
      ) {
        return null;
      }

      return configuracion;
    } catch {
      localStorage.removeItem(this.obtenerStorageKey(empresaId));
      return null;
    }
  }

  private obtenerStorageKey(empresaId: number): string {
    return `${this.storagePrefix}${empresaId}`;
  }
}
