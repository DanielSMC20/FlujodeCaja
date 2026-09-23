import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ArrowLeft,
  LoaderCircle,
  LucideAngularModule,
  Mail,
  Send,
} from 'lucide-angular';

import { finalize } from 'rxjs';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.scss',
})
export class RecuperarPasswordComponent {

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  readonly iconos = {
    correo: Mail,
    enviar: Send,
    volver: ArrowLeft,
    cargando: LoaderCircle,
  };

  enviando = false;

  enviado = false;

  mensaje = '';

  mensajeError = '';

  readonly formulario =
    this.formBuilder.nonNullable.group({
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
    });


  enviar(): void {

    if (
      this.formulario.invalid ||
      this.enviando
    ) {

      this.formulario.markAllAsTouched();

      return;
    }

    this.enviando = true;

    this.enviado = false;

    this.mensaje = '';

    this.mensajeError = '';

    const correo =
      this.formulario.controls.correo.value;


    this.authService
      .solicitarRecuperacionPassword(
        correo,
      )
      .pipe(
        finalize(() => {
          this.enviando = false;
        }),
      )
      .subscribe({

        next: (mensaje) => {

          this.enviado = true;

          this.mensaje = mensaje;

        },

        error: (error: Error) => {

          this.mensajeError =
            error.message;

        },

      });
  }


  get correoInvalido(): boolean {

    const control =
      this.formulario.controls.correo;

    return (
      control.touched &&
      control.invalid
    );
  }
}