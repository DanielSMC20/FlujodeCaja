import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  Eye,
  EyeOff,
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
  };

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = false;
  authError = '';

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

    remember: [true],
  });

  ngOnInit(): void {

    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/inicio');
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
    this.authError = '';

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

          void this.router.navigateByUrl('/inicio');

        },

        error: (error) => {

          this.authError =
            error instanceof Error
              ? error.message
              : 'No se pudo iniciar sesión. Verifica tus credenciales.';

        },

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
