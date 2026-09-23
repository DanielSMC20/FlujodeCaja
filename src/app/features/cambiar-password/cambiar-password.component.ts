import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Eye, EyeOff, KeyRound, LucideAngularModule, ShieldCheck } from 'lucide-angular';
import { finalize } from 'rxjs';

import { CuentaUsuarioService } from '../../nucleo/servicios/cuenta-usuario.service';

const passwordsCoinciden: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const nueva = control.get('nuevaPassword')?.value;
  const confirmacion = control.get('confirmarPassword')?.value;
  return nueva && confirmacion && nueva !== confirmacion
    ? { passwordsNoCoinciden: true }
    : null;
};

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './cambiar-password.component.html',
  styleUrl: './cambiar-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cuentaService = inject(CuentaUsuarioService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly iconos = {
    seguridad: ShieldCheck,
    clave: KeyRound,
    mostrar: Eye,
    ocultar: EyeOff,
  };

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      passwordActual: ['', [Validators.required]],
      nuevaPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: passwordsCoinciden },
  );

  mostrarActual = false;
  mostrarNueva = false;
  mostrarConfirmacion = false;
  guardando = false;
  mensajeError = '';

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    this.guardando = true;
    this.mensajeError = '';

    this.cuentaService
      .cambiarPassword(
        datos.passwordActual,
        datos.nuevaPassword,
        datos.confirmarPassword,
      )
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/inicio'),
        error: (error: Error) => {
          this.mensajeError = error.message;
          this.changeDetectorRef.markForCheck();
        },
      });
  }
}
