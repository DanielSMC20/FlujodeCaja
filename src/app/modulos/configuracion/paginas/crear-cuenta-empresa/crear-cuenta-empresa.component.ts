import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  LucideAngularModule,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-angular';
import { finalize } from 'rxjs';

import { CuentaEmpresaCreada } from '../../../../nucleo/modelos/cuenta-empresa.model';
import { CuentaEmpresaService } from '../../../../nucleo/servicios/cuenta-empresa.service';
import { SesionEmpresaService } from '../../../../nucleo/servicios/sesion-empresa.service';

const passwordsCoincidenValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmacion = control.get('confirmarPassword')?.value;

  if (!password || !confirmacion) {
    return null;
  }

  return password === confirmacion ? null : { passwordsNoCoinciden: true };
};

@Component({
  selector: 'app-crear-cuenta-empresa',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],
  templateUrl: './crear-cuenta-empresa.component.html',
  styleUrl: './crear-cuenta-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearCuentaEmpresaComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cuentaEmpresaService = inject(CuentaEmpresaService);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly empresaActual$ = this.sesionEmpresaService.empresaActual$;
  readonly roles$ = this.cuentaEmpresaService.listarRoles();

  readonly iconos = {
    volver: ArrowLeft,
    empresa: Building2,
    usuario: UserPlus,
    correo: Mail,
    password: LockKeyhole,
    mostrar: Eye,
    ocultar: EyeOff,
    rol: ShieldCheck,
    correcto: Check,
    informacion: Info,
    exito: CircleCheck,
    error: AlertCircle,
  };

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(150)]],
      correo: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254)],
      ],
      rolId: [3, [Validators.required]],
      password: [
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
    { validators: passwordsCoincidenValidator },
  );

  mostrarPassword = false;
  mostrarConfirmacion = false;
  guardando = false;
  mensajeError = '';
  cuentaCreada: CuentaEmpresaCreada | null = null;

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();

    this.guardando = true;
    this.mensajeError = '';

    this.cuentaEmpresaService
      .crearCuenta({
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        correo: valores.correo,
        password: valores.password,
        rolId: valores.rolId,
      })
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cuenta) => {
          this.cuentaCreada = cuenta;
          this.changeDetectorRef.markForCheck();
        },
        error: (error: Error) => {
          this.mensajeError =
            error.message || 'No fue posible crear la cuenta. Intenta nuevamente.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  crearOtraCuenta(): void {
    this.cuentaCreada = null;
    this.mensajeError = '';
    this.mostrarPassword = false;
    this.mostrarConfirmacion = false;
    this.formulario.reset({
      nombres: '',
      apellidos: '',
      correo: '',
      rolId: 3,
      password: '',
      confirmarPassword: '',
    });
  }

  volverAConfiguracion(): void {
    void this.router.navigateByUrl('/configuracion');
  }

  tieneMinimo(password: string): boolean {
    return password.length >= 8;
  }

  tieneMayuscula(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  tieneMinuscula(password: string): boolean {
    return /[a-z]/.test(password);
  }

  tieneNumero(password: string): boolean {
    return /\d/.test(password);
  }
}
