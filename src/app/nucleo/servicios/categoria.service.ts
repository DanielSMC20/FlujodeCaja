import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  throwError,
} from 'rxjs';

import {
  ActualizarCategoriaRequest,
  CategoriaMovimiento,
  RegistrarCategoriaRequest,
} from '../modelos/categoria-movimiento';

import { SesionEmpresaService } from './sesion-empresa.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private readonly categorias: CategoriaMovimiento[] = [
    {
      id: 1,
      empresaId: 1,
      nombre: 'Venta en barra',
      tipoMovimiento: 1,
      descripcion: 'Ventas realizadas en barra y POS',
      estado: true,
    },
    {
      id: 2,
      empresaId: 1,
      nombre: 'Entradas',
      tipoMovimiento: 1,
      descripcion: 'Venta de entradas y preventas',
      estado: true,
    },
    {
      id: 3,
      empresaId: 1,
      nombre: 'Reservas',
      tipoMovimiento: 1,
      descripcion: 'Adelantos y reservas de mesas',
      estado: true,
    },
    {
      id: 4,
      empresaId: 1,
      nombre: 'DJ / Artistas',
      tipoMovimiento: 2,
      descripcion: 'Pago a DJ, artistas y producciones',
      estado: true,
    },
    {
      id: 5,
      empresaId: 1,
      nombre: 'Seguridad',
      tipoMovimiento: 2,
      descripcion: 'Pago al personal de seguridad',
      estado: true,
    },
    {
      id: 6,
      empresaId: 1,
      nombre: 'Bebidas e insumos',
      tipoMovimiento: 2,
      descripcion: 'Reposición de bebidas e insumos',
      estado: true,
    },
    {
      id: 7,
      empresaId: 1,
      nombre: 'Alquiler',
      tipoMovimiento: 2,
      descripcion: 'Alquiler del local',
      estado: true,
    },
    {
      id: 8,
      empresaId: 1,
      nombre: 'Servicios básicos',
      tipoMovimiento: 2,
      descripcion: 'Luz, agua, internet y telefonía',
      estado: true,
    },
  ];

  private readonly categoriasSubject = new BehaviorSubject<
    CategoriaMovimiento[]
  >(this.copiarCategorias());

  constructor(private readonly sesionEmpresaService: SesionEmpresaService) {}

  listarCategorias(): Observable<CategoriaMovimiento[]> {
    return combineLatest([
      this.categoriasSubject,
      this.sesionEmpresaService.empresaActual$,
    ]).pipe(
      map(([categorias, empresa]) =>
        categorias
          .filter((categoria) => categoria.empresaId === empresa.id)
          .map((categoria) => ({
            ...categoria,
          })),
      ),
    );
  }

  listarCategoriasPorTipo(
    tipoMovimiento: number,
  ): Observable<CategoriaMovimiento[]> {
    return combineLatest([
      this.categoriasSubject,
      this.sesionEmpresaService.empresaActual$,
    ]).pipe(
      map(([categorias, empresa]) =>
        categorias
          .filter(
            (categoria) =>
              categoria.empresaId === empresa.id &&
              categoria.tipoMovimiento === tipoMovimiento &&
              categoria.estado,
          )
          .map((categoria) => ({
            ...categoria,
          })),
      ),
    );
  }

  obtenerCategoriaPorId(id: number): CategoriaMovimiento | undefined {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const categoria = this.categorias.find(
      (item) => item.id === id && item.empresaId === empresaActualId,
    );

    return categoria
      ? {
          ...categoria,
        }
      : undefined;
  }

  registrarCategoria(
    request: RegistrarCategoriaRequest,
  ): Observable<CategoriaMovimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const nombre = request.nombre.trim();

    const descripcion = request.descripcion.trim();

    if (!nombre) {
      return throwError(
        () => new Error('El nombre de la categoría es obligatorio.'),
      );
    }

    if (request.tipoMovimiento !== 1 && request.tipoMovimiento !== 2) {
      return throwError(() => new Error('El tipo de movimiento no es válido.'));
    }

    const existe = this.categorias.some(
      (categoria) =>
        categoria.empresaId === empresaActualId &&
        categoria.tipoMovimiento === request.tipoMovimiento &&
        categoria.nombre.trim().toLowerCase() === nombre.toLowerCase(),
    );

    if (existe) {
      return throwError(
        () =>
          new Error(
            'Ya existe una categoría con ese nombre para este tipo de movimiento.',
          ),
      );
    }

    const nuevoId =
      this.categorias.length > 0
        ? Math.max(...this.categorias.map((categoria) => categoria.id)) + 1
        : 1;

    const categoria: CategoriaMovimiento = {
      id: nuevoId,

      empresaId: empresaActualId,

      nombre,

      tipoMovimiento: request.tipoMovimiento,

      descripcion,

      estado: true,
    };

    this.categorias.push(categoria);

    this.notificarCambios();

    return of({
      ...categoria,
    });
  }

  actualizarCategoria(
    id: number,
    request: ActualizarCategoriaRequest,
  ): Observable<CategoriaMovimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const indice = this.categorias.findIndex(
      (categoria) =>
        categoria.id === id && categoria.empresaId === empresaActualId,
    );

    if (indice === -1) {
      return throwError(() => new Error('La categoría no existe.'));
    }

    const nombre = request.nombre.trim();

    const descripcion = request.descripcion.trim();

    if (!nombre) {
      return throwError(
        () => new Error('El nombre de la categoría es obligatorio.'),
      );
    }

    const categoriaActual = this.categorias[indice];

    const duplicada = this.categorias.some(
      (categoria) =>
        categoria.id !== id &&
        categoria.empresaId === empresaActualId &&
        categoria.tipoMovimiento === categoriaActual.tipoMovimiento &&
        categoria.nombre.trim().toLowerCase() === nombre.toLowerCase(),
    );

    if (duplicada) {
      return throwError(
        () =>
          new Error(
            'Ya existe una categoría con ese nombre para este tipo de movimiento.',
          ),
      );
    }

    const categoriaActualizada: CategoriaMovimiento = {
      ...categoriaActual,

      nombre,

      descripcion,
    };

    this.categorias[indice] = categoriaActualizada;

    this.notificarCambios();

    return of({
      ...categoriaActualizada,
    });
  }

  cambiarEstado(id: number): Observable<CategoriaMovimiento> {
    const empresaActualId = this.sesionEmpresaService.empresaActualId;

    const indice = this.categorias.findIndex(
      (categoria) =>
        categoria.id === id && categoria.empresaId === empresaActualId,
    );

    if (indice === -1) {
      return throwError(() => new Error('La categoría no existe.'));
    }

    const categoria = this.categorias[indice];

    const categoriaActualizada: CategoriaMovimiento = {
      ...categoria,

      estado: !categoria.estado,
    };

    this.categorias[indice] = categoriaActualizada;

    this.notificarCambios();

    return of({
      ...categoriaActualizada,
    });
  }

  private notificarCambios(): void {
    this.categoriasSubject.next(this.copiarCategorias());
  }

  private copiarCategorias(): CategoriaMovimiento[] {
    return this.categorias.map((categoria) => ({
      ...categoria,
    }));
  }
}
