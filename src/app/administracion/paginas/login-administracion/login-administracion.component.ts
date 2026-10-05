import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { finalize } from 'rxjs';

import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LucideAngularModule,
  Mail,
  ShieldCheck,
} from 'lucide-angular';

import { PlataformaAuthService } from '../../servicios/plataforma-auth.service';

@Component({
  selector: 'app-login-administracion',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],

  templateUrl: './login-administracion.component.html',

  styleUrl: './login-administracion.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginAdministracionComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly router = inject(Router);

  private readonly authService = inject(PlataformaAuthService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly iconos = {
    escudo: ShieldCheck,

    empresa: Building2,

    correo: Mail,

    clave: LockKeyhole,

    ver: Eye,

    ocultar: EyeOff,

    ingresar: ArrowRight,

    cargando: LoaderCircle,
  };

  mostrarContrasena = false;

  enviando = false;

  readonly formulario = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],

    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/administracion/empresas');
    }
  }

  alternarContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  ingresar(): void {
    if (this.formulario.invalid || this.enviando) {
      this.formulario.markAllAsTouched();

      return;
    }

    const valores = this.formulario.getRawValue();

    this.enviando = true;

    this.authService
      .login(valores.correo, valores.password)
      .pipe(
        finalize(() => {
          this.enviando = false;

          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/administracion/empresas');
        },

        error: (error) => {
          const mensaje =
            error instanceof Error
              ? error.message
              : 'No se pudo iniciar sesión.';

          void this.mostrarError(mensaje);
        },
      });
  }

  tieneError(
    campo: 'correo' | 'password',

    error: string,
  ): boolean {
    const control = this.formulario.controls[campo];

    return control.touched && control.hasError(error);
  }

  private async mostrarError(mensaje: string): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'error',

      title: 'No pudimos iniciar sesión',

      text: mensaje,

      confirmButtonText: 'Entendido',

      confirmButtonColor: '#2563eb',

      heightAuto: false,
    });
  }
}
