import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  finalize,
  Subject,
  startWith,
  switchMap
} from 'rxjs';

import {
  ConfiguracionFinanciera
} from '../../../../nucleo/modelos/configuracion-financiera.model';

import { RouterLink } from '@angular/router';

import {
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleCheck,
  Clock3,
  Coins,
  Globe2,
  Mail,
  ShieldCheck,
  Tags,
  UsersRound,
  LucideAngularModule,
  WalletCards,
  CalendarDays,
} from 'lucide-angular';

import { SesionEmpresaService } from '../../../../nucleo/servicios/sesion-empresa.service';

import { SesionUsuarioService } from '../../../../nucleo/servicios/sesion-usuario.service';

import { ConfiguracionFinancieraService } from '../../../../nucleo/servicios/configuracion-financiera.service';

import { MonedaSolPipe } from '../../../../compartido/pipes/moneda-sol.pipe';

@Component({
  selector: 'app-configuracion',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    LucideAngularModule,
    MonedaSolPipe,
    ReactiveFormsModule
  ],

  templateUrl: './configuracion.component.html',

  styleUrl: './configuracion.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionComponent {

  private readonly formBuilder = inject(FormBuilder);
private readonly cdr = inject(ChangeDetectorRef);

guardandoSaldo = false;
editandoSaldo = false;

errorSaldo = '';
exitoSaldo = '';

readonly fechaHoy = this.obtenerFechaLocal();

readonly saldoFormulario =
  this.formBuilder.nonNullable.group({
    saldoInicial: [
      0,
      [Validators.required, Validators.min(0)]
    ],
    fechaSaldoInicial: [
      this.fechaHoy,
      [Validators.required]
    ]
  });
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  private readonly configuracionFinancieraService = inject(
    ConfiguracionFinancieraService,
  );

  readonly empresaActual$ = this.sesionEmpresaService.empresaActual$;

  readonly usuarioActual$ = this.sesionUsuarioService.usuarioActual$;

private readonly recargarSaldo = new Subject<void>();

readonly configuracionFinanciera$ =
  this.recargarSaldo.pipe(
    startWith(void 0),
    switchMap(() =>
      this.configuracionFinancieraService.obtenerConfiguracion()
    )
  );

  get esAdministrador(): boolean {
    return this.sesionUsuarioService.esAdministrador;
  }

  readonly iconos = {
    empresa: Building2,

    verificada: BadgeCheck,

    moneda: Coins,

    zonaHoraria: Globe2,

    seguridad: ShieldCheck,

    categorias: Tags,

    usuarios: UsersRound,

    correo: Mail,

    ultimoAcceso: Clock3,

    siguiente: ChevronRight,

    correcto: CircleCheck,

    saldoInicial: WalletCards,

    fechaApertura: CalendarDays,
  };

  obtenerIniciales(nombreComercial: string): string {
    return nombreComercial
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join('');
  }

  iniciarEdicionSaldo(
  configuracion: ConfiguracionFinanciera
): void {

  if (!this.esAdministrador || this.guardandoSaldo) {
    return;
  }

  this.errorSaldo = '';
  this.exitoSaldo = '';

  this.saldoFormulario.setValue({
    saldoInicial: configuracion.saldoInicial,
    fechaSaldoInicial: configuracion.fechaSaldoInicial
  });

  this.editandoSaldo = true;
}

cancelarEdicionSaldo(): void {

  if (this.guardandoSaldo) {
    return;
  }

  this.editandoSaldo = false;
  this.errorSaldo = '';

  this.saldoFormulario.reset({
    saldoInicial: 0,
    fechaSaldoInicial: this.fechaHoy
  });
}

guardarSaldo(): void {

  if (!this.esAdministrador || this.guardandoSaldo) {
    return;
  }

  this.errorSaldo = '';
  this.exitoSaldo = '';

  if (this.saldoFormulario.invalid) {
    this.saldoFormulario.markAllAsTouched();
    return;
  }

  const datos = this.saldoFormulario.getRawValue();

  if (datos.fechaSaldoInicial > this.fechaHoy) {
    this.errorSaldo =
      'La fecha de apertura no puede ser futura.';
    return;
  }

  const request = {
    saldoInicial: Number(datos.saldoInicial),
    fechaSaldoInicial: datos.fechaSaldoInicial,
    moneda: 1
  };

  const esEdicion = this.editandoSaldo;

  const operacion$ = esEdicion
    ? this.configuracionFinancieraService
        .editarConfiguracion(request)
    : this.configuracionFinancieraService
        .actualizarConfiguracion(request);

  this.guardandoSaldo = true;

  operacion$
    .pipe(
      finalize(() => {
        this.guardandoSaldo = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: () => {
        this.editandoSaldo = false;

        this.exitoSaldo = esEdicion
          ? 'Saldo de apertura actualizado correctamente.'
          : 'Saldo de apertura registrado correctamente.';

        this.recargarSaldo.next();
        this.cdr.markForCheck();
      },

      error: (error: unknown) => {
        this.errorSaldo = error instanceof Error
          ? error.message
          : 'No se pudo guardar el saldo de apertura.';

        this.cdr.markForCheck();
      }
    });
}

private obtenerFechaLocal(): string {

  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}
}
