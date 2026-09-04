import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { UsuarioSesion } from '../modelos/usuario-sesion.model';

@Injectable({ providedIn: 'root' })
export class SesionUsuarioService {
  private readonly storageKey = 'fc_usuario_sesion';

  private readonly usuarioVacio: UsuarioSesion = {
    id: 0,
    empresaId: 0,
    nombres: '',
    apellidos: '',
    correo: '',
    correoVerificado: true,
    activo: true,
    ultimoAcceso: null,
    roles: [],
  };

  private readonly usuarioActualSubject = new BehaviorSubject<UsuarioSesion>(
    this.restaurarUsuario(),
  );

  readonly usuarioActual$: Observable<UsuarioSesion> =
    this.usuarioActualSubject.asObservable();

  get usuarioActual(): UsuarioSesion {
    return this.usuarioActualSubject.value;
  }

  get usuarioActualId(): number {
    return this.usuarioActualSubject.value.id;
  }

  get nombreCompleto(): string {
    const usuario = this.usuarioActualSubject.value;
    return `${usuario.nombres} ${usuario.apellidos}`.trim();
  }

  get rolPrincipal(): string {
    return this.usuarioActualSubject.value.roles[0]?.nombre ?? 'Sin rol asignado';
  }

  establecerUsuario(usuario: UsuarioSesion): void {
    localStorage.setItem(this.storageKey, JSON.stringify(usuario));
    this.usuarioActualSubject.next({
      ...usuario,
      roles: usuario.roles.map((rol) => ({ ...rol })),
    });
  }

  limpiarSesion(): void {
    localStorage.removeItem(this.storageKey);
    this.usuarioActualSubject.next({ ...this.usuarioVacio, roles: [] });
  }

  private restaurarUsuario(): UsuarioSesion {
    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return { ...this.usuarioVacio, roles: [] };
    }

    try {
      const usuario = JSON.parse(raw) as UsuarioSesion;
      return usuario?.id
        ? {
            ...usuario,
            roles: Array.isArray(usuario.roles)
              ? usuario.roles.map((rol) => ({ ...rol }))
              : [],
          }
        : { ...this.usuarioVacio, roles: [] };
    } catch {
      localStorage.removeItem(this.storageKey);
      return { ...this.usuarioVacio, roles: [] };
    }
  }
}
