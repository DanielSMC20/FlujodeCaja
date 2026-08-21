import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BarraSuperiorComponent } from '../barra-superior/barra-superior.component';
import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

@Component({
  selector: 'app-estructura-principal',
  standalone: true,
  imports: [RouterOutlet, BarraSuperiorComponent, MenuLateralComponent],
  templateUrl: './estructura-principal.component.html',
  styleUrl: './estructura-principal.component.scss'
})
export class EstructuraPrincipalComponent {
  menuAbierto = false;

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }
}
