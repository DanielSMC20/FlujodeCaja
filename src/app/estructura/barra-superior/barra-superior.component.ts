import { AsyncPipe } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
} from '@angular/core';

import { SesionEmpresaService } from '../../nucleo/servicios/sesion-empresa.service';

import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';
import { ChevronRight, LucideAngularModule, Menu, Plus } from 'lucide-angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-barra-superior',

  standalone: true,

  imports: [AsyncPipe, LucideAngularModule, RouterLink],

  templateUrl: './barra-superior.component.html',

  styleUrl: './barra-superior.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraSuperiorComponent {
  readonly iconos = {
    menu: Menu,
    abrirUsuario: ChevronRight,
    registrar: Plus,
  };
  private readonly sesionEmpresaService = inject(SesionEmpresaService);

  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  @Output()
  toggleMenu = new EventEmitter<void>();

  readonly empresaActual$ = this.sesionEmpresaService.empresaActual$;

  readonly usuarioActual$ = this.sesionUsuarioService.usuarioActual$;

  alternarMenu(): void {
    this.toggleMenu.emit();
  }

  obtenerIniciales(texto: string): string {
    const palabras = texto
      .trim()
      .split(/\s+/)
      .filter((palabra) => palabra.length > 0);

    if (palabras.length === 0) {
      return 'E';
    }

    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }

    return (palabras[0].charAt(0) + palabras[1].charAt(0)).toUpperCase();
  }

  obtenerInicialesUsuario(nombres: string, apellidos: string): string {
    const inicialNombre = nombres.trim().charAt(0);

    const inicialApellido = apellidos.trim().charAt(0);

    return (inicialNombre + inicialApellido).toUpperCase();
  }
}
