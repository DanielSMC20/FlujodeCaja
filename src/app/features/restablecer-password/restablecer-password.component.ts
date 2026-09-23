import { CommonModule } from '@angular/common';

import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LucideAngularModule,
} from 'lucide-angular';

import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';


const passwordsCoinciden: ValidatorFn =
  (
    control: AbstractControl,
  ): ValidationErrors | null => {

    const nueva =
      control.get('nuevaPassword')?.value;

    const confirmar =
      control.get('confirmarPassword')?.value;

    return (
      nueva &&
      confirmar &&
      nueva !== confirmar
    )
      ? { passwordsNoCoinciden: true }
      : null;
  };


@Component({
  selector: 'app-restablecer-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './restablecer-password.component.html',
  styleUrl: './restablecer-password.component.scss',
})
export class RestablecerPasswordComponent
  implements OnInit {

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);


  readonly iconos = {
    seguridad: LockKeyhole,
    clave: KeyRound,
    mostrar: Eye,
    ocultar: EyeOff,
    cargando: LoaderCircle,
  };


  token = '';

  tokenValido = false;

  guardando = false;

  mostrarNueva = false;

  mostrarConfirmacion = false;

  mensajeError = '';


  readonly formulario =
    this.formBuilder.nonNullable.group(
      {

        nuevaPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(72),

            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
            ),
          ],
        ],

        confirmarPassword: [
          '',
          [
            Validators.required,
          ],
        ],

      },

      {
        validators: passwordsCoinciden,
      },
    );


  ngOnInit(): void {

    this.token =
      this.route.snapshot.queryParamMap
        .get('token')
        ?.trim() ?? '';

    this.tokenValido =
      this.token.length >= 32;
  }


  guardar(): void {

    if (
      !this.tokenValido ||
      this.formulario.invalid ||
      this.guardando
    ) {

      this.formulario.markAllAsTouched();

      return;
    }


    const datos =
      this.formulario.getRawValue();


    this.guardando = true;

    this.mensajeError = '';


    this.authService
      .restablecerPassword(
        this.token,
        datos.nuevaPassword,
        datos.confirmarPassword,
      )
      .pipe(
        finalize(() => {
          this.guardando = false;
        }),
      )
      .subscribe({

        next: async (mensaje) => {

          const { default: Swal } =
            await import('sweetalert2');

          await Swal.fire({
            icon: 'success',
            title: 'Contraseña actualizada',
            text: mensaje,
            confirmButtonText: 'Iniciar sesión',
            confirmButtonColor: '#17648a',
            heightAuto: false,
          });

          await this.router.navigateByUrl(
            '/login',
          );
        },

        error: (error: Error) => {

          this.mensajeError =
            error.message;

        },

      });
  }
}