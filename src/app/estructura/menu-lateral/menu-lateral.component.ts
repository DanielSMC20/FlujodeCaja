import { CommonModule } from '@angular/common';
import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  LucideAngularModule,
  LucideIconData,
} from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';

interface OpcionMenu {
  label: string;
  path: string;
  icon: LucideIconData;
  exact?: boolean;
}

@Component({
  selector: 'app-menu-lateral',
  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],

  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuLateralComponent {
  
  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  get mostrarGestion(): boolean {
    return this.sesionUsuarioService.esAdministrador;
  }

  private readonly authService = inject(AuthService);

  @Input()
  menuAbierto = false;

  @Output()
  cerrarMenu = new EventEmitter<void>();

  readonly nombreProducto = 'Flujo Claro';

  readonly descripcionProducto =
    'Gestión financiera';

  readonly opcionesNavegacion: OpcionMenu[] = [
    {
      label: 'Inicio',
      path: '/inicio',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Movimientos',
      path: '/movimientos',
      icon: ArrowLeftRight,
    },
    {
      label: 'Flujo de caja',
      path: '/flujo-caja',
      icon: ChartNoAxesCombined,
    },
    {
      label: 'Reportes',
      path: '/reportes',
      icon: FileChartColumn,
    },
  ];

  readonly opcionesGestion: OpcionMenu[] = [
    {
      label: 'Clasificadores',
      path: '/categorias',
      icon: Tags,
    },
    {
      label: 'Configuración',
      path: '/configuracion',
      icon: Settings,
    },
  ];

  readonly iconoCerrarSesion = LogOut;

  seleccionar(): void {
    this.cerrarMenu.emit();
  }

  cerrarSesion(): void {
    this.authService.logout(true);

    this.seleccionar();
  }
}
