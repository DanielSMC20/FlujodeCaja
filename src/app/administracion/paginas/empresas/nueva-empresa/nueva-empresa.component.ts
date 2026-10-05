import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LoaderCircle,
  LucideAngularModule,
  Mail,
  Save,
  UserRound,
} from 'lucide-angular';

import { CrearEmpresaPlataformaRequest } from '../../../modelos/empresa-plataforma.model';

import { PlataformaEmpresaService } from '../../../servicios/plataforma-empresa.service';

@Component({
  selector: 'app-nueva-empresa',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],

  templateUrl: './nueva-empresa.component.html',

  styleUrl: './nueva-empresa.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaEmpresaComponent {
  private readonly formBuilder = inject(FormBuilder);

  private readonly router = inject(Router);

  private readonly empresaService = inject(PlataformaEmpresaService);

  readonly guardando = signal(false);

  readonly mostrarPassword = signal(false);

  readonly mostrarConfirmacion = signal(false);

  readonly iconos = {
    volver: ArrowLeft,

    empresa: Building2,

    usuario: UserRound,

    correo: Mail,

    clave: KeyRound,

    moneda: Coins,

    zona: Globe2,

    guardar: Save,

    cargando: LoaderCircle,

    ver: Eye,

    ocultar: EyeOff,

    correcto: CheckCircle2,
  };

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],

      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],

      nombreComercial: ['', [Validators.required, Validators.maxLength(150)]],

      monedaBase: [1, [Validators.required]],

      zonaHoraria: [
        'America/Lima',
        [Validators.required, Validators.maxLength(64)],
      ],

      nombres: ['', [Validators.required, Validators.maxLength(100)]],

      apellidos: ['', [Validators.required, Validators.maxLength(100)]],

      correo: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254)],
      ],

      passwordTemporal: [
        '',
        [
          Validators.required,

          Validators.minLength(8),

          Validators.maxLength(72),
        ],
      ],

      confirmarPassword: ['', [Validators.required]],
    },

    {
      validators: [this.passwordsIguales],
    },
  );

  guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();

      return;
    }

    const valores = this.formulario.getRawValue();

    const request: CrearEmpresaPlataformaRequest = {
      ruc: valores.ruc.trim(),

      razonSocial: valores.razonSocial.trim(),

      nombreComercial: valores.nombreComercial.trim(),

      monedaBase: valores.monedaBase,

      zonaHoraria: valores.zonaHoraria.trim(),

      administrador: {
        nombres: valores.nombres.trim(),

        apellidos: valores.apellidos.trim(),

        correo: valores.correo.trim().toLowerCase(),

        passwordTemporal: valores.passwordTemporal,
      },
    };

    this.guardando.set(true);

    this.empresaService
      .crear(request)
      .pipe(
        finalize(() => {
          this.guardando.set(false);
        }),
      )
      .subscribe({
        next: (empresa) => {
          void this.mostrarExito(
            empresa.empresaId,

            empresa.razonSocial,
          );
        },

        error: (error) => {
          void this.mostrarError(
            error instanceof Error
              ? error.message
              : 'No se pudo crear la empresa.',
          );
        },
      });
  }

  alternarPassword(): void {
    this.mostrarPassword.update((actual) => !actual);
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((actual) => !actual);
  }

  tieneError(
    campo: keyof typeof this.formulario.controls,

    error: string,
  ): boolean {
    const control = this.formulario.controls[campo];

    return control.touched && control.hasError(error);
  }

  passwordsNoCoinciden(): boolean {
    return (
      this.formulario.controls.confirmarPassword.touched &&
      this.formulario.hasError('passwordsNoCoinciden')
    );
  }

  private passwordsIguales(control: AbstractControl): ValidationErrors | null {
    const password = control.get('passwordTemporal')?.value;

    const confirmacion = control.get('confirmarPassword')?.value;

    if (!password || !confirmacion) {
      return null;
    }

    if (password === confirmacion) {
      return null;
    }

    return {
      passwordsNoCoinciden: true,
    };
  }

  private async mostrarExito(
    empresaId: number,

    razonSocial: string,
  ): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'success',

      title: 'Empresa creada',

      text: `${razonSocial} fue registrada correctamente.`,

      confirmButtonText: 'Ver empresa',

      confirmButtonColor: '#2563eb',

      heightAuto: false,
    });

    void this.router.navigate(['/administracion/empresas', empresaId]);
  }

  private async mostrarError(mensaje: string): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'error',

      title: 'No se pudo crear la empresa',

      text: mensaje,

      confirmButtonText: 'Aceptar',

      confirmButtonColor: '#2563eb',

      heightAuto: false,
    });
  }
}
