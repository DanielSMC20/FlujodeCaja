import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
  BehaviorSubject,
  finalize,
  switchMap,
} from 'rxjs';

import {
  Ellipsis,
  KeyRound,
  LucideAngularModule,
  Pencil,
  Plus,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-angular';

import {
  UsuarioEmpresa,
} from '../../../../nucleo/modelos/cuenta-empresa.model';

import {
  CuentaEmpresaService,
} from '../../../../nucleo/servicios/cuenta-empresa.service';

import {
  SesionUsuarioService,
} from '../../../../nucleo/servicios/sesion-usuario.service';


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

  /* =======================================================
     ICONOS
     ======================================================= */

  readonly Plus = Plus;

  readonly Users = Users;

  readonly Ellipsis = Ellipsis;

  readonly Pencil = Pencil;

  readonly KeyRound = KeyRound;

  readonly UserRoundX = UserRoundX;

  readonly UserRoundCheck = UserRoundCheck;

  readonly X = X;


  /* =======================================================
     SERVICIOS
     ======================================================= */

  private readonly service =
    inject(CuentaEmpresaService);

  private readonly fb =
    inject(FormBuilder);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly sesionUsuarioService =
    inject(SesionUsuarioService);


  /* =======================================================
     RECARGA
     ======================================================= */

  private readonly recargar$ =
    new BehaviorSubject<void>(undefined);


  /* =======================================================
     DATOS
     ======================================================= */

  readonly usuarios$ =
    this.recargar$.pipe(

      switchMap(() =>
        this.service.listarUsuarios()
      ),

    );


  readonly roles$ =
    this.service.listarRoles();


  /* =======================================================
     EDICIÓN
     ======================================================= */

  usuarioEditando:
    UsuarioEmpresa | null = null;


  guardando = false;


  /* =======================================================
     MENÚ DE ACCIONES
     ======================================================= */

  usuarioMenuAcciones:
    UsuarioEmpresa | null = null;


  menuPosicion = {
    top: 0,
    left: 0,
  };


  /* =======================================================
     FORMULARIO
     ======================================================= */

  readonly formulario =
    this.fb.nonNullable.group({

      nombres: [
        '',
        [
          Validators.required,
          Validators.maxLength(100),
        ],
      ],

      apellidos: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
        ],
      ],

      rolId: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

    });


  /* =======================================================
     ABRIR MENÚ
     ======================================================= */

  abrirMenuAcciones(
    event: MouseEvent,
    usuario: UsuarioEmpresa,
  ): void {

    event.preventDefault();

    event.stopPropagation();


    const boton =
      event.currentTarget as HTMLElement;


    const rect =
      boton.getBoundingClientRect();


    const anchoMenu = 230;

    const separacion = 6;

    const margenPantalla = 12;


    /*
     * El menú de un usuario normal tiene aproximadamente
     * tres opciones.
     *
     * El usuario actual solamente muestra la opción
     * de restablecer contraseña.
     */

    const altoMenu =
      this.esUsuarioActual(usuario)
        ? 52
        : 132;


    /* =====================================================
       POSICIÓN HORIZONTAL
       ===================================================== */

    let left =
      rect.right - anchoMenu;


    /*
     * Evitar que salga por el lado izquierdo.
     */

    if (left < margenPantalla) {

      left =
        margenPantalla;

    }


    /*
     * Evitar que salga por el lado derecho.
     */

    const limiteDerecho =
      window.innerWidth -
      anchoMenu -
      margenPantalla;


    if (left > limiteDerecho) {

      left =
        limiteDerecho;

    }


    /* =====================================================
       POSICIÓN VERTICAL
       ===================================================== */

    let top =
      rect.bottom +
      separacion;


    /*
     * Si abajo no hay espacio suficiente,
     * abrir el menú hacia arriba.
     */

    const espacioInferior =
      window.innerHeight -
      rect.bottom;


    if (
      espacioInferior <
      altoMenu + separacion + margenPantalla
    ) {

      top =
        rect.top -
        altoMenu -
        separacion;

    }


    /*
     * Protección para pantallas pequeñas.
     */

    if (top < margenPantalla) {

      top =
        margenPantalla;

    }


    /* =====================================================
       ASIGNAR POSICIÓN
       ===================================================== */

    this.menuPosicion = {
      top,
      left,
    };


    this.usuarioMenuAcciones =
      usuario;


    this.cdr.markForCheck();
  }


  /* =======================================================
     CERRAR MENÚ
     ======================================================= */

  cerrarMenuAcciones(): void {

    this.usuarioMenuAcciones =
      null;


    this.cdr.markForCheck();
  }


  /* =======================================================
     EDITAR DESDE MENÚ
     ======================================================= */

  editarDesdeMenu(): void {

    if (!this.usuarioMenuAcciones) {

      return;

    }


    const usuario =
      this.usuarioMenuAcciones;


    this.cerrarMenuAcciones();


    this.editar(usuario);
  }


  /* =======================================================
     PASSWORD DESDE MENÚ
     ======================================================= */

  resetPasswordDesdeMenu(): void {

    if (!this.usuarioMenuAcciones) {

      return;

    }


    const usuario =
      this.usuarioMenuAcciones;


    this.cerrarMenuAcciones();


    void this.resetPassword(usuario);
  }


  /* =======================================================
     CAMBIAR ESTADO DESDE MENÚ
     ======================================================= */

  cambiarEstadoDesdeMenu(): void {

    if (!this.usuarioMenuAcciones) {

      return;

    }


    const usuario =
      this.usuarioMenuAcciones;


    this.cerrarMenuAcciones();


    void this.cambiarEstado(usuario);
  }


  /* =======================================================
     EDITAR
     ======================================================= */

  editar(
    usuario: UsuarioEmpresa,
  ): void {

    this.usuarioEditando =
      usuario;


    this.formulario.setValue({

      nombres:
        usuario.nombres,

      apellidos:
        usuario.apellidos,

      rolId:
        usuario.rol.id,

    });


    this.cdr.markForCheck();
  }


  /* =======================================================
     CANCELAR EDICIÓN
     ======================================================= */

  cancelar(): void {

    this.usuarioEditando =
      null;


    this.formulario.reset({

      nombres: '',

      apellidos: '',

      rolId: 0,

    });


    this.cdr.markForCheck();
  }


  /* =======================================================
     CERRAR MODAL AL HACER CLICK EN EL FONDO
     ======================================================= */

  cerrarModalDesdeFondo(
    event: MouseEvent,
  ): void {

    /*
     * Solo cerrar si el usuario hizo click directamente
     * sobre el fondo.
     *
     * Los clicks dentro del modal no lo cerrarán.
     */

    if (
      event.target !==
      event.currentTarget
    ) {

      return;

    }


    if (this.guardando) {

      return;

    }


    this.cancelar();
  }


  /* =======================================================
     GUARDAR
     ======================================================= */

  guardar(): void {

    if (
      !this.usuarioEditando ||
      this.formulario.invalid ||
      this.guardando
    ) {

      this.formulario.markAllAsTouched();

      return;

    }


    const formulario =
      this.formulario.getRawValue();


    /*
     * Normalizamos strings antes de enviarlos.
     */

    const datos = {

      nombres:
        formulario.nombres.trim(),

      apellidos:
        formulario.apellidos.trim(),

      rolId:
        formulario.rolId,

    };


    /*
     * Evitar enviar nombres vacíos compuestos
     * únicamente por espacios.
     */

    if (
      !datos.nombres ||
      !datos.apellidos
    ) {

      this.formulario.markAllAsTouched();

      return;

    }


    this.guardando =
      true;


    const usuarioId =
      this.usuarioEditando.id;


    this.service
      .actualizarUsuario(
        usuarioId,
        datos,
      )
      .pipe(

        finalize(() => {

          this.guardando =
            false;


          this.cdr.markForCheck();

        }),

        takeUntilDestroyed(
          this.destroyRef
        ),

      )
      .subscribe({

        next: async () => {

          this.cancelar();


          this.recargar$.next();


          const {
            default: Swal,
          } =
            await import(
              'sweetalert2'
            );


          await Swal.fire({

            icon: 'success',

            title:
              'Usuario actualizado',

            text:
              'Los cambios fueron guardados correctamente.',

            confirmButtonText:
              'Aceptar',

            heightAuto:
              false,

          });

        },


        error: async (error) => {

          const {
            default: Swal,
          } =
            await import(
              'sweetalert2'
            );


          await Swal.fire({

            icon: 'error',

            title:
              'No se pudo actualizar',

            text:
              error instanceof Error
                ? error.message
                : 'Ocurrió un error al actualizar el usuario.',

            confirmButtonText:
              'Aceptar',

            heightAuto:
              false,

          });

        },

      });
  }


  /* =======================================================
     CAMBIAR ESTADO
     ======================================================= */

  async cambiarEstado(
    usuario: UsuarioEmpresa,
  ): Promise<void> {

    /*
     * Protección adicional desde frontend.
     */

    if (
      this.esUsuarioActual(usuario)
    ) {

      return;

    }


    const {
      default: Swal,
    } =
      await import(
        'sweetalert2'
      );


    const activar =
      !usuario.activa;


    const accion =
      activar
        ? 'activar'
        : 'desactivar';


    const resultado =
      await Swal.fire({

        icon: 'question',

        title:
          activar
            ? 'Activar usuario'
            : 'Desactivar usuario',

        text:
          `¿Deseas ${accion} el acceso de ` +
          `${usuario.nombres} ${usuario.apellidos}?`,

        showCancelButton:
          true,

        confirmButtonText:
          activar
            ? 'Activar'
            : 'Desactivar',

        cancelButtonText:
          'Cancelar',

        reverseButtons:
          true,

        focusCancel:
          true,

        heightAuto:
          false,

      });


    if (
      !resultado.isConfirmed
    ) {

      return;

    }


    this.service
      .cambiarEstadoUsuario(
        usuario.id,
        activar,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

      )
      .subscribe({

        next: () => {

          this.recargar$.next();

        },


        error: (error) => {

          void Swal.fire({

            icon: 'error',

            title:
              'No se pudo cambiar el estado',

            text:
              error instanceof Error
                ? error.message
                : 'Ocurrió un error al cambiar el estado del usuario.',

            confirmButtonText:
              'Aceptar',

            heightAuto:
              false,

          });

        },

      });
  }


  /* =======================================================
     RESTABLECER CONTRASEÑA
     ======================================================= */

  async resetPassword(
    usuario: UsuarioEmpresa,
  ): Promise<void> {

    const {
      default: Swal,
    } =
      await import(
        'sweetalert2'
      );


    const resultado =
      await Swal.fire<string>({

        title:
          'Restablecer contraseña',

        text:
          `Define una contraseña temporal para ${usuario.correo}.`,

        input:
          'password',

        inputLabel:
          'Nueva contraseña temporal',

        inputPlaceholder:
          'Mínimo 8 caracteres',

        inputAttributes: {

          minlength:
            '8',

          maxlength:
            '72',

          autocomplete:
            'new-password',

        },

        showCancelButton:
          true,

        confirmButtonText:
          'Restablecer',

        cancelButtonText:
          'Cancelar',

        reverseButtons:
          true,

        focusCancel:
          true,

        heightAuto:
          false,

        inputValidator:
          (valor) => {

            const password =
              valor?.trim();


            if (!password) {

              return 'Ingresa una contraseña temporal.';

            }


            if (
              password.length < 8
            ) {

              return 'La contraseña debe tener al menos 8 caracteres.';

            }


            if (
              password.length > 72
            ) {

              return 'La contraseña no puede superar los 72 caracteres.';

            }


            return null;

          },

      });


    if (
      !resultado.isConfirmed ||
      !resultado.value
    ) {

      return;

    }


    const nuevaPassword =
      resultado.value.trim();


    this.service
      .restablecerPasswordUsuario(
        usuario.id,
        nuevaPassword,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

      )
      .subscribe({

        next: () => {

          void Swal.fire({

            icon:
              'success',

            title:
              'Contraseña restablecida',

            text:
              'El usuario podrá ingresar con la nueva contraseña temporal.',

            confirmButtonText:
              'Aceptar',

            heightAuto:
              false,

          });

        },


        error: (error) => {

          void Swal.fire({

            icon:
              'error',

            title:
              'No se pudo restablecer',

            text:
              error instanceof Error
                ? error.message
                : 'Ocurrió un error al restablecer la contraseña.',

            confirmButtonText:
              'Aceptar',

            heightAuto:
              false,

          });

        },

      });
  }


  /* =======================================================
     USUARIO ACTUAL
     ======================================================= */

  esUsuarioActual(
    usuario: UsuarioEmpresa,
  ): boolean {

    return (
      usuario.id ===
      this.sesionUsuarioService.usuarioActualId
    );
  }


  /* =======================================================
     EVENTOS GLOBALES
     ======================================================= */

  @HostListener(
    'document:keydown.escape'
  )
  alPresionarEscape(): void {

    /*
     * Prioridad:
     *
     * 1. Cerrar menú.
     * 2. Cerrar modal.
     */

    if (
      this.usuarioMenuAcciones
    ) {

      this.cerrarMenuAcciones();

      return;

    }


    if (
      this.usuarioEditando &&
      !this.guardando
    ) {

      this.cancelar();

    }
  }


  @HostListener(
    'window:resize'
  )
  alCambiarTamanoVentana(): void {

    if (
      this.usuarioMenuAcciones
    ) {

      this.cerrarMenuAcciones();

    }
  }


  @HostListener(
    'window:scroll'
  )
  alHacerScroll(): void {

    if (
      this.usuarioMenuAcciones
    ) {

      this.cerrarMenuAcciones();

    }
  }

}