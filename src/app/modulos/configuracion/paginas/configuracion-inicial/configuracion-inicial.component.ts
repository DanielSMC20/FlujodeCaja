import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap, take } from 'rxjs';
import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleCheck,
  Coins,
  Plus,
  Tags,
  Trash2,
  WalletCards,
  LucideAngularModule,
} from 'lucide-angular';

import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';
import { ConfiguracionFinancieraService } from '../../../../nucleo/servicios/configuracion-financiera.service';
import { SesionEmpresaService } from '../../../../nucleo/servicios/sesion-empresa.service';

@Component({
  selector: 'app-configuracion-inicial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './configuracion-inicial.component.html',
  styleUrl: './configuracion-inicial.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionInicialComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly configuracionService = inject(ConfiguracionFinancieraService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly empresa = this.sesionEmpresaService.empresaActual;
  readonly fechaInicio = this.obtenerFechaLocalActual();

  readonly iconos = {
    marca: ChartNoAxesCombined,
    saldo: WalletCards,
    moneda: Coins,
    categorias: Tags,
    agregar: Plus,
    eliminar: Trash2,
    continuar: ArrowRight,
    correcto: CircleCheck,
  };

  guardando = false;
  errorGuardado = '';

  readonly formulario = this.formBuilder.nonNullable.group({
    saldoInicial: [0, [Validators.required, Validators.min(0)]],
    fechaSaldoInicial: [this.fechaInicio, [Validators.required]],
    moneda: [1, [Validators.required]],
 egresos: this.formBuilder.array([
  this.crearControlClasificador(''),
]),
  });

  get egresos(): FormArray {
    return this.formulario.controls.egresos;
  }

  ngOnInit(): void {
    forkJoin({
      configuracion: this.configuracionService.obtenerConfiguracion().pipe(take(1)),
      ingresos: this.categoriaService.listarCategoriasPorTipo(1).pipe(take(1)),
      egresos: this.categoriaService.listarCategoriasPorTipo(2).pipe(take(1)),
    }).subscribe({
      next: ({ configuracion, ingresos, egresos }) => {
        if (
          configuracion?.configuracionInicialCompletada === true &&
          this.existeClasificadorVentas(ingresos) &&
          egresos.length > 0
        ) {
          void this.router.navigateByUrl('/inicio');
        }
      },
      error: () => {
        // La pantalla queda disponible para que el usuario pueda completar
        // la configuración cuando el backend vuelva a responder.
      },
    });
  }

  agregarClasificador(): void {
    this.egresos.push(this.crearControlClasificador(''));
  }

  eliminarClasificador(indice: number): void {
    if (this.egresos.length <= 1) {
      return;
    }

    this.egresos.removeAt(indice);
  }

  guardarConfiguracion(): void {
    this.errorGuardado = '';

    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    const nombresEgreso = this.normalizarClasificadores(datos.egresos);

    if (nombresEgreso.length === 0) {
      this.errorGuardado =
        'Registra al menos un clasificador de egreso.';
      return;
    }

    if (this.tieneDuplicados(nombresEgreso)) {
      this.errorGuardado =
        'No repitas nombres dentro del mismo tipo de clasificador.';
      return;
    }

    this.guardando = true;

    const categorias = [
      {
        nombre: 'Ventas',
        tipoMovimiento: 1,
        descripcion: 'Clasificador interno para los ingresos diarios por Efectivo y POS.',
      },
      ...nombresEgreso.map((nombre) => ({
        nombre,
        tipoMovimiento: 2,
        descripcion: 'Clasificador definido durante la configuración inicial.',
      })),
    ];

    forkJoin({
      ingresos: this.categoriaService.listarCategoriasPorTipo(1).pipe(take(1)),
      egresos: this.categoriaService.listarCategoriasPorTipo(2).pipe(take(1)),
    })
      .pipe(
        map(({ ingresos, egresos }) => {
          const existentes = new Set(
            [...ingresos, ...egresos].map(
              (categoria) =>
                `${categoria.tipoMovimiento}|${categoria.nombre.trim().toLowerCase()}`,
            ),
          );

          return categorias.filter(
            (categoria) =>
              !existentes.has(
                `${categoria.tipoMovimiento}|${categoria.nombre.trim().toLowerCase()}`,
              ),
          );
        }),
        switchMap((pendientes) =>
          pendientes.length > 0
            ? forkJoin(
                pendientes.map((categoria) =>
                  this.categoriaService.registrarCategoria(categoria),
                ),
              )
            : of([]),
        ),
        switchMap(() =>
          this.configuracionService.actualizarConfiguracion({
            saldoInicial: Number(datos.saldoInicial),
            fechaSaldoInicial: datos.fechaSaldoInicial,
            moneda: datos.moneda,
          }),
        ),
        finalize(() => {
          this.guardando = false;
          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/inicio');
        },
        error: (error) => {
          this.errorGuardado =
            error instanceof Error
              ? error.message
              : 'No se pudo completar la configuración inicial.';
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  private crearControlClasificador(valor: string) {
    return this.formBuilder.nonNullable.control(valor, [
      Validators.required,
      Validators.maxLength(80),
    ]);
  }

  private normalizarClasificadores(valores: string[]): string[] {
    return valores.map((valor) => valor.trim()).filter(Boolean);
  }

  private tieneDuplicados(valores: string[]): boolean {
    const normalizados = valores.map((valor) => valor.toLowerCase());
    return new Set(normalizados).size !== normalizados.length;
  }

  private existeClasificadorVentas(
    categorias: Array<{ nombre: string }>,
  ): boolean {
    return categorias.some(
      (categoria) => categoria.nombre.trim().toLowerCase() === 'ventas',
    );
  }

  private obtenerFechaLocalActual(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
