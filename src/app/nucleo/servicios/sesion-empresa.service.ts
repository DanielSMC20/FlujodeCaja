import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { EmpresaSesion } from '../modelos/empresa-sesion.model';

@Injectable({ providedIn: 'root' })
export class SesionEmpresaService {
  private readonly storageKey = 'fc_empresa_sesion';

  private readonly empresaVacia: EmpresaSesion = {
    id: 0,
    ruc: null,
    razonSocial: '',
    nombreComercial: '',
    monedaBase: 1,
    monedaBaseDescripcion: 'Soles',
    monedaBaseAbreviatura: 'PEN',
    zonaHoraria: 'America/Lima',
    activa: true,
  };

  private readonly empresaActualSubject = new BehaviorSubject<EmpresaSesion>(
    this.restaurarEmpresa(),
  );

  readonly empresaActual$: Observable<EmpresaSesion> =
    this.empresaActualSubject.asObservable();

  get empresaActual(): EmpresaSesion {
    return this.empresaActualSubject.value;
  }

  get empresaActualId(): number {
    return this.empresaActualSubject.value.id;
  }

  establecerEmpresa(empresa: EmpresaSesion): void {
    localStorage.setItem(this.storageKey, JSON.stringify(empresa));
    this.empresaActualSubject.next({ ...empresa });
  }

  limpiarSesion(): void {
    localStorage.removeItem(this.storageKey);
    this.empresaActualSubject.next({ ...this.empresaVacia });
  }

  private restaurarEmpresa(): EmpresaSesion {
    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return { ...this.empresaVacia };
    }

    try {
      const empresa = JSON.parse(raw) as EmpresaSesion;
      return empresa?.id ? empresa : { ...this.empresaVacia };
    } catch {
      localStorage.removeItem(this.storageKey);
      return { ...this.empresaVacia };
    }
  }
}
