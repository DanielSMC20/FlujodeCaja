import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { UsuarioSesion } from '../modelos/usuario-sesion.model';

@Injectable({
  providedIn: 'root',
})
export class SesionUsuarioService {
  private readonly usuarios: UsuarioSesion[] = [
    {
      id: 1,
      empresaId: 1,
      nombres: 'Carlos',
      apellidos: 'Reyes',
      correo: 'gerencia@comercialreyes.com',
      rol: 'Administrador',
    },
    {
      id: 2,
      empresaId: 2,
      nombres: 'Luis',
      apellidos: 'Ramírez',
      correo: 'admin@nightclubcentral.com',
      rol: 'Administrador',
    },
  ];

  private readonly usuarioActualSubject = new BehaviorSubject<UsuarioSesion>(
    this.usuarios[0],
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

    return `${usuario.nombres} ${usuario.apellidos}`;
  }

  cambiarUsuarioDemo(usuarioId: number): void {
    const usuario = this.usuarios.find((item) => item.id === usuarioId);

    if (!usuario) {
      return;
    }

    this.usuarioActualSubject.next(usuario);
  }
}
