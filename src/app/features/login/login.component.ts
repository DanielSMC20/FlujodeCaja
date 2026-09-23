import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router,  RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LucideAngularModule,
  Mail,
} from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  readonly iconos = {
    marca: ChartNoAxesCombined,
    beneficio: Check,
    correo: Mail,
    clave: LockKeyhole,
    mostrar: Eye,
    ocultar: EyeOff,
    ingresar: ArrowRight,
    cargando: LoaderCircle,
  };

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = false;

  mostrarContrasena = false;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
      ],
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
      ],
    ],

  });

  ngOnInit(): void {

    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl(
        this.authService.requiereCambioPassword()
          ? '/cuenta/cambiar-password'
          : '/inicio',
      );
    }

  }

  alternarVisibilidadContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  submit(): void {

    if (this.loginForm.invalid || this.isSubmitting) {

      this.loginForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;

    const {
      email,
      password,
    } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({

        next: () => {

          void this.router.navigateByUrl(
            this.authService.requiereCambioPassword()
              ? '/cuenta/cambiar-password'
              : '/inicio',
          );

        },

        error: (error) => {
          const mensaje =
            error instanceof Error
              ? error.message
              : 'No se pudo iniciar sesión. Verifica tus credenciales.';

          void this.mostrarErrorAutenticacion(mensaje);
        },

      });

  }

  private async mostrarErrorAutenticacion(mensaje: string): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'error',
      title: 'No pudimos iniciar sesión',
      text: mensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#2563eb',
      heightAuto: false,
      allowOutsideClick: true,
      allowEscapeKey: true,
    });
  }

  hasError(
    controlName: 'email' | 'password',
    errorName: string,
  ): boolean {

    const control =
      this.loginForm.controls[controlName];

    return (
      control.touched &&
      control.hasError(errorName)
    );

  }

}
