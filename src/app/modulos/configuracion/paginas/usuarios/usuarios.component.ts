import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RouterLink } from '@angular/router';

import { BehaviorSubject, finalize, switchMap } from 'rxjs';

import { LucideAngularModule, Plus, Users } from 'lucide-angular';

import { UsuarioEmpresa } from '../../../../nucleo/modelos/cuenta-empresa.model';
import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';

import { CuentaEmpresaService } from '../../../../nucleo/servicios/cuenta-empresa.service';

@Component({
  selector: 'app-usuarios',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],

  templateUrl: './usuarios.component.html',

  styleUrl: './usuarios.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent {
  readonly Plus = Plus;

  readonly Users = Users;

  private readonly service = inject(CuentaEmpresaService);

  private readonly fb = inject(FormBuilder);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroyRef = inject(DestroyRef);

  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  readonly usuarios$ = this.recargar$.pipe(
    switchMap(() => this.service.listarUsuarios()),
  );

  readonly roles$ = this.service.listarRoles();

  usuarioEditando: UsuarioEmpresa | null = null;

  guardando = false;

  readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],

    apellidos: ['', [Validators.required, Validators.maxLength(150)]],

    rolId: [0, [Validators.required, Validators.min(1)]],
  });

  editar(usuario: UsuarioEmpresa): void {
    this.usuarioEditando = usuario;

    this.formulario.setValue({
      nombres: usuario.nombres,

      apellidos: usuario.apellidos,

      rolId: usuario.rol.id,
    });
  }

  cancelar(): void {
    this.usuarioEditando = null;

    this.formulario.reset({
      nombres: '',

      apellidos: '',

      rolId: 0,
    });
  }

  guardar(): void {
    if (!this.usuarioEditando || this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();

      return;
    }

    const datos = this.formulario.getRawValue();

    this.guardando = true;

    this.service
      .actualizarUsuario(this.usuarioEditando.id, datos)
      .pipe(
        finalize(() => {
          this.guardando = false;

          this.cdr.markForCheck();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: async () => {
          this.cancelar();

          this.recargar$.next();

          const { default: Swal } = await import('sweetalert2');

          await Swal.fire({
            icon: 'success',

            title: 'Usuario actualizado',

            confirmButtonText: 'Aceptar',

            heightAuto: false,
          });
        },

        error: async (error) => {
          const { default: Swal } = await import('sweetalert2');

          await Swal.fire({
            icon: 'error',

            title: 'No se pudo actualizar',

            text: error instanceof Error ? error.message : 'Ocurrió un error.',

            confirmButtonText: 'Aceptar',

            heightAuto: false,
          });
        },
      });
  }

  async cambiarEstado(usuario: UsuarioEmpresa): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    const accion = usuario.activa ? 'desactivar' : 'activar';

    const resultado = await Swal.fire({
      icon: 'question',

      title: usuario.activa ? 'Desactivar usuario' : 'Activar usuario',

      text:
        `¿Deseas ${accion} el acceso de ` +
        `${usuario.nombres} ${usuario.apellidos}?`,

      showCancelButton: true,

      confirmButtonText: usuario.activa ? 'Desactivar' : 'Activar',

      cancelButtonText: 'Cancelar',

      heightAuto: false,
    });

    if (!resultado.isConfirmed) {
      return;
    }

    this.service
      .cambiarEstadoUsuario(usuario.id, !usuario.activa)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.recargar$.next();
        },

        error: (error) => {
          void Swal.fire({
            icon: 'error',

            title: 'No se pudo cambiar el estado',

            text: error instanceof Error ? error.message : 'Ocurrió un error.',

            heightAuto: false,
          });
        },
      });
  }

  async resetPassword(usuario: UsuarioEmpresa): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    const resultado = await Swal.fire<string>({
      title: 'Restablecer contraseña',

      text: `Define una contraseña temporal para ${usuario.correo}.`,

      input: 'password',

      inputLabel: 'Nueva contraseña temporal',

      inputAttributes: {
        minlength: '8',

        maxlength: '72',

        autocomplete: 'new-password',
      },

      showCancelButton: true,

      confirmButtonText: 'Restablecer',

      cancelButtonText: 'Cancelar',

      heightAuto: false,

      inputValidator: (valor) => {
        if (!valor || valor.length < 8) {
          return 'La contraseña debe ' + 'tener al menos 8 caracteres.';
        }

        return null;
      },
    });

    if (!resultado.isConfirmed || !resultado.value) {
      return;
    }

    this.service
      .restablecerPasswordUsuario(usuario.id, resultado.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          void Swal.fire({
            icon: 'success',

            title: 'Contraseña restablecida',

            text: 'El usuario podrá ingresar con la nueva contraseña temporal.',

            heightAuto: false,
          }),

        error: (error) =>
          void Swal.fire({
            icon: 'error',

            title: 'No se pudo restablecer',

            text: error instanceof Error ? error.message : 'Ocurrió un error.',

            heightAuto: false,
          }),
      });
  }

  esUsuarioActual(
  usuario: UsuarioEmpresa,
): boolean {

  return (
    usuario.id ===
    this.sesionUsuarioService.usuarioActualId
  );
}
}
