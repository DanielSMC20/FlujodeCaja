import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { EmpresaSesion } from '../modelos/empresa-sesion.model';

@Injectable({
  providedIn: 'root',
})
export class SesionEmpresaService {
  private readonly empresas: EmpresaSesion[] = [
    {
    id: 1,
    nombre: 'Boulevard Eventos S.A.C.',
    nombreComercial: 'Boulevard',
    rubro: 'Entretenimiento y eventos',
    }

  ];

  private readonly empresaActualSubject = new BehaviorSubject<EmpresaSesion>(
    this.empresas[0],
  );

  readonly empresaActual$: Observable<EmpresaSesion> =
    this.empresaActualSubject.asObservable();

  get empresaActual(): EmpresaSesion {
    return this.empresaActualSubject.value;
  }

  get empresaActualId(): number {
    return this.empresaActualSubject.value.id;
  }

  cambiarEmpresaDemo(empresaId: number): void {
    const empresa = this.empresas.find((item) => item.id === empresaId);

    if (!empresa) {
      return;
    }

    this.empresaActualSubject.next(empresa);
  }
}
