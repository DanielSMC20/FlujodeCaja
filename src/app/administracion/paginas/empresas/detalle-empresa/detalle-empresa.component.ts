import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';

import { finalize } from 'rxjs';

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleCheck,
  Coins,
  Globe2,
  LoaderCircle,
  LucideAngularModule,
  Mail,
  RefreshCw,
  Save,
  UserRound,
} from 'lucide-angular';

import {
  ActualizarEmpresaPlataformaRequest,
  EmpresaPlataforma,
} from '../../../modelos/empresa-plataforma.model';

import { PlataformaEmpresaService } from '../../../servicios/plataforma-empresa.service';

@Component({
  selector: 'app-detalle-empresa',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],

  templateUrl: './detalle-empresa.component.html',

  styleUrl: './detalle-empresa.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleEmpresaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly formBuilder = inject(FormBuilder);

  private readonly empresaService = inject(PlataformaEmpresaService);

  readonly empresa = signal<EmpresaPlataforma | null>(null);

  readonly cargando = signal(true);

  readonly guardando = signal(false);

  readonly error = signal<string | null>(null);

  readonly iconos = {
    volver: ArrowLeft,

    empresa: Building2,

    usuario: UserRound,

    correo: Mail,

    moneda: Coins,

    zona: Globe2,

    fecha: CalendarDays,

    estado: CircleCheck,

    guardar: Save,

    cargando: LoaderCircle,

    recargar: RefreshCw,
  };

  readonly formulario = this.formBuilder.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],

    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],

    nombreComercial: ['', [Validators.required, Validators.maxLength(150)]],

    monedaBase: [1, [Validators.required]],

    zonaHoraria: [
      'America/Lima',
      [Validators.required, Validators.maxLength(64)],
    ],
  });

  private empresaId = 0;

  ngOnInit(): void {
    const empresaId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      this.cargando.set(false);

      this.error.set('El identificador de la empresa no es válido.');

      return;
    }

    this.empresaId = empresaId;

    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.cargando.set(true);

    this.error.set(null);

    this.empresaService
      .obtener(this.empresaId)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (empresa) => {
          this.empresa.set(empresa);

          this.formulario.reset({
            ruc: empresa.ruc,

            razonSocial: empresa.razonSocial,

            nombreComercial: empresa.nombreComercial,

            monedaBase: empresa.monedaBase,

            zonaHoraria: empresa.zonaHoraria,
          });

          this.formulario.markAsPristine();
        },

        error: (error) => {
          this.empresa.set(null);

          this.error.set(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la empresa.',
          );
        },
      });
  }

  guardarCambios(): void {
    if (this.formulario.invalid || this.guardando() || !this.empresa()) {
      this.formulario.markAllAsTouched();

      return;
    }

    const valores = this.formulario.getRawValue();

    const request: ActualizarEmpresaPlataformaRequest = {
      ruc: valores.ruc.trim(),

      razonSocial: valores.razonSocial.trim(),

      nombreComercial: valores.nombreComercial.trim(),

      monedaBase: valores.monedaBase,

      zonaHoraria: valores.zonaHoraria.trim(),
    };

    this.guardando.set(true);

    this.empresaService
      .actualizar(
        this.empresaId,

        request,
      )
      .pipe(
        finalize(() => {
          this.guardando.set(false);
        }),
      )
      .subscribe({
        next: (empresa) => {
          this.empresa.set(empresa);

          this.formulario.markAsPristine();

          void this.mostrarExito();
        },

        error: (error) => {
          void this.mostrarError(
            error instanceof Error
              ? error.message
              : 'No se pudo actualizar la empresa.',
          );
        },
      });
  }

  tieneError(
    campo: keyof typeof this.formulario.controls,

    error: string,
  ): boolean {
    const control = this.formulario.controls[campo];

    return control.touched && control.hasError(error);
  }

  obtenerIniciales(): string {
    const empresa = this.empresa();

    if (!empresa) {
      return 'E';
    }

    const texto = empresa.nombreComercial || empresa.razonSocial;

    return texto
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((valor) => valor.charAt(0).toUpperCase())
      .join('');
  }

  obtenerInicialesAdministrador(): string {
    const empresa = this.empresa();

    if (!empresa) {
      return 'A';
    }

    const nombre = empresa.administradorNombres?.trim().charAt(0) ?? '';

    const apellido = empresa.administradorApellidos?.trim().charAt(0) ?? '';

    return `${nombre}${apellido}`.toUpperCase() || 'A';
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }

    const fechaBase = fecha.substring(0, 10);

    const partes = fechaBase.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  private async mostrarExito(): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'success',

      title: 'Cambios guardados',

      text: 'Los datos de la empresa fueron actualizados correctamente.',

      confirmButtonText: 'Aceptar',

      confirmButtonColor: '#2563eb',

      heightAuto: false,
    });
  }

  private async mostrarError(mensaje: string): Promise<void> {
    const { default: Swal } = await import('sweetalert2');

    await Swal.fire({
      icon: 'error',

      title: 'No se pudo actualizar',

      text: mensaje,

      confirmButtonText: 'Aceptar',

      confirmButtonColor: '#2563eb',

      heightAuto: false,
    });
  }
}
