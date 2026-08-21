import { AsyncPipe, CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { finalize } from 'rxjs';

import { CategoriaMovimiento } from '../../../../nucleo/modelos/categoria-movimiento';

import { CategoriaService } from '../../../../nucleo/servicios/categoria.service';

import { LucideAngularModule, Plus } from 'lucide-angular';

@Component({
  selector: 'app-lista-categorias',

  standalone: true,

  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    LucideAngularModule,
  ],

  templateUrl: './lista-categorias.component.html',

  styleUrl: './lista-categorias.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaCategoriasComponent {
  readonly Plus = Plus;

  private readonly categoriaService = inject(CategoriaService);

  private readonly formBuilder = inject(FormBuilder);

  private readonly destroyRef = inject(DestroyRef);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly categorias$ = this.categoriaService.listarCategorias();

  mostrarFormulario = false;

  categoriaEditandoId: number | null = null;

  guardando = false;

  errorGuardado = '';

  readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],

    tipoMovimiento: [1, [Validators.required]],

    descripcion: ['', [Validators.maxLength(200)]],
  });

  get modoEdicion(): boolean {
    return this.categoriaEditandoId !== null;
  }

  get tituloFormulario(): string {
    return this.modoEdicion ? 'Editar categoría' : 'Nueva categoría';
  }

  nuevaCategoria(): void {
    this.categoriaEditandoId = null;

    this.errorGuardado = '';

    this.formulario.reset({
      nombre: '',

      tipoMovimiento: 1,

      descripcion: '',
    });

    this.formulario.controls.tipoMovimiento.enable({
      emitEvent: false,
    });

    this.formulario.markAsPristine();

    this.formulario.markAsUntouched();

    this.mostrarFormulario = true;
  }

  editarCategoria(categoria: CategoriaMovimiento): void {
    this.categoriaEditandoId = categoria.id;

    this.errorGuardado = '';

    this.formulario.setValue({
      nombre: categoria.nombre,

      tipoMovimiento: categoria.tipoMovimiento,

      descripcion: categoria.descripcion,
    });

    this.formulario.controls.tipoMovimiento.disable({
      emitEvent: false,
    });

    this.formulario.markAsPristine();

    this.formulario.markAsUntouched();

    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;

    this.categoriaEditandoId = null;

    this.errorGuardado = '';

    this.formulario.controls.tipoMovimiento.enable({
      emitEvent: false,
    });
  }

  guardarCategoria(): void {
    this.errorGuardado = '';

    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();

      return;
    }

    this.guardando = true;

    const datos = this.formulario.getRawValue();

    const operacion$ =
      this.modoEdicion && this.categoriaEditandoId !== null
        ? this.categoriaService.actualizarCategoria(this.categoriaEditandoId, {
            nombre: datos.nombre,

            descripcion: datos.descripcion,
          })
        : this.categoriaService.registrarCategoria({
            nombre: datos.nombre,

            tipoMovimiento: datos.tipoMovimiento,

            descripcion: datos.descripcion,
          });

    operacion$
      .pipe(
        finalize(() => {
          this.guardando = false;

          this.changeDetectorRef.markForCheck();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelarFormulario();

          this.changeDetectorRef.markForCheck();
        },

        error: (error) => {
          this.errorGuardado =
            error instanceof Error
              ? error.message
              : 'No se pudo guardar la categoría.';

          this.changeDetectorRef.markForCheck();
        },
      });
  }

  cambiarEstado(categoria: CategoriaMovimiento): void {
    this.categoriaService
      .cambiarEstado(categoria.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  etiquetaTipo(tipoMovimiento: number): string {
    return tipoMovimiento === 1 ? 'Ingreso' : 'Egreso';
  }
}
