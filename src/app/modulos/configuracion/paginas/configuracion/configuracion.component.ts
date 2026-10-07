import { AsyncPipe, CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
  ],

  templateUrl: './configuracion.component.html',

  styleUrl: './configuracion.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionComponent {
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  private readonly configuracionFinancieraService = inject(
    ConfiguracionFinancieraService,
  );

  readonly empresaActual$ = this.sesionEmpresaService.empresaActual$;

  readonly usuarioActual$ = this.sesionUsuarioService.usuarioActual$;

  readonly configuracionFinanciera$ =
    this.configuracionFinancieraService.obtenerConfiguracion();

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
}
