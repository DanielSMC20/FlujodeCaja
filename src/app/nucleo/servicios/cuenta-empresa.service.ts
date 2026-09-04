import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  CrearCuentaEmpresaRequest,
  CuentaEmpresaCreada,
  RolGestion,
} from '../modelos/cuenta-empresa.model';
import { SesionEmpresaService } from './sesion-empresa.service';

@Injectable({ providedIn: 'root' })
export class CuentaEmpresaService {
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly roles: RolGestion[] = [
    {
      id: 1,
      codigo: 'ADMINISTRADOR',
      nombre: 'Administrador',
      descripcion: 'Administra la empresa, usuarios y configuración.',
    },
    {
      id: 2,
      codigo: 'CONTADOR',
      nombre: 'Contador',
      descripcion: 'Gestiona movimientos, flujo de caja y reportes.',
    },
    {
      id: 3,
      codigo: 'OPERADOR',
      nombre: 'Operador',
      descripcion: 'Registra y actualiza información financiera.',
    },
    {
      id: 4,
      codigo: 'CONSULTA',
      nombre: 'Consulta',
      descripcion: 'Acceso de lectura a indicadores y reportes.',
    },
  ];

  private readonly cuentas: CuentaEmpresaCreada[] = [
    {
      id: 1,
      empresaId: 1,
      nombres: 'Carlos',
      apellidos: 'Reyes',
      correo: 'administrador@boulevard.pe',
      rol: this.roles[0],
      activa: true,
      fechaRegistro: new Date().toISOString(),
    },
  ];

  listarRoles(): Observable<RolGestion[]> {
    return of(this.roles.map((rol) => ({ ...rol })));
  }

  crearCuenta(
    request: CrearCuentaEmpresaRequest,
  ): Observable<CuentaEmpresaCreada> {
    const empresaId = this.sesionEmpresaService.empresaActualId;
    const correoNormalizado = request.correo.trim().toLowerCase();

    const correoDuplicado = this.cuentas.some(
      (cuenta) =>
        cuenta.empresaId === empresaId &&
        cuenta.correo.toLowerCase() === correoNormalizado,
    );

    if (correoDuplicado) {
      return throwError(
        () => new Error('Ya existe una cuenta con este correo en la empresa.'),
      );
    }

    const rol = this.roles.find((item) => item.id === request.rolId);

    if (!rol) {
      return throwError(() => new Error('Selecciona un rol válido.'));
    }

    // La contraseña no se conserva en el frontend. El backend deberá recibirla
    // por HTTPS, generar el hash y ejecutar el registro transaccional.
    void request.password;

    const cuentaCreada: CuentaEmpresaCreada = {
      id: Math.max(0, ...this.cuentas.map((cuenta) => cuenta.id)) + 1,
      empresaId,
      nombres: request.nombres.trim(),
      apellidos: request.apellidos.trim(),
      correo: correoNormalizado,
      rol: { ...rol },
      activa: true,
      fechaRegistro: new Date().toISOString(),
    };

    this.cuentas.push(cuentaCreada);

    return of({ ...cuentaCreada }).pipe(delay(650));
  }
}
