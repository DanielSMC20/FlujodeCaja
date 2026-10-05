import { CommonModule } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import {
  Building2,
  LogOut,
  LucideAngularModule,
  ShieldCheck,
} from 'lucide-angular';

import { PlataformaAuthService } from '../../servicios/plataforma-auth.service';

@Component({
  selector: 'app-administracion-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],

  templateUrl: './administracion-layout.component.html',

  styleUrl: './administracion-layout.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministracionLayoutComponent {
  private readonly authService = inject(PlataformaAuthService);

  readonly administrador = this.authService.getAdministrador();

  readonly iconos = {
    marca: ShieldCheck,

    empresas: Building2,

    salir: LogOut,
  };

  cerrarSesion(): void {
    this.authService.logout(true);
  }

  get inicialesAdministrador(): string {
    const administrador = this.administrador;

    if (!administrador) {
      return 'AS';
    }

    const nombre = administrador.nombres?.trim().charAt(0) ?? '';

    const apellido = administrador.apellidos?.trim().charAt(0) ?? '';

    const iniciales = `${nombre}${apellido}`.toUpperCase();

    return iniciales || 'AS';
  }
}
