import {
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  RouterLink,
} from '@angular/router';

import {
  Building2,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  LucideAngularModule,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-angular';

import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
} from 'rxjs';

import {
  EmpresaPlataforma,
} from '../../../modelos/empresa-plataforma.model';

import {
  PlataformaEmpresaService,
} from '../../../servicios/plataforma-empresa.service';


@Component({

  selector:
    'app-lista-empresas',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],

  templateUrl:
    './lista-empresas.component.html',

  styleUrl:
    './lista-empresas.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,

})
export class ListaEmpresasComponent
  implements OnInit {

  private readonly empresaService =
    inject(
      PlataformaEmpresaService,
    );


  private readonly destroyRef =
    inject(
      DestroyRef,
    );


  readonly iconos = {

    empresa:
      Building2,

    buscar:
      Search,

    nueva:
      Plus,

    detalle:
      ChevronRight,

    usuario:
      UserRound,

    correo:
      Mail,

    fecha:
      CalendarDays,

    activa:
      CircleCheck,

    recargar:
      RefreshCw,
  };


  readonly busquedaControl =
    new FormControl(
      '',
      {
        nonNullable:
          true,
      },
    );


  readonly empresas =
    signal<EmpresaPlataforma[]>(
      [],
    );


  readonly cargando =
    signal(
      true,
    );


  readonly error =
    signal<string | null>(
      null,
    );


  readonly totalEmpresas =
    computed(
      () =>
        this
          .empresas()
          .length,
    );


  readonly totalActivas =
    computed(
      () =>
        this
          .empresas()
          .filter(
            (empresa) =>
              empresa.activa,
          )
          .length,
    );


  readonly totalAdministradores =
    computed(
      () =>
        this
          .empresas()
          .filter(
            (empresa) =>
              !!empresa
                .administradorUsuarioId,
          )
          .length,
    );


  ngOnInit():
    void {

    this.busquedaControl
      .valueChanges
      .pipe(

        startWith(
          this.busquedaControl
            .value,
        ),

        debounceTime(
          300,
        ),

        distinctUntilChanged(),

        switchMap(
          (busqueda) => {

            this.cargando
              .set(
                true,
              );


            this.error
              .set(
                null,
              );


            return this
              .empresaService
              .listar(
                busqueda,
              );
          },
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({

        next: (
          empresas,
        ) => {

          this.empresas
            .set(
              empresas,
            );


          this.cargando
            .set(
              false,
            );
        },


        error: (
          error,
        ) => {

          this.empresas
            .set(
              [],
            );


          this.error
            .set(

              error instanceof Error

                ? error.message

                : 'No se pudieron obtener las empresas.',
            );


          this.cargando
            .set(
              false,
            );
        },
      });
  }


  limpiarBusqueda():
    void {

    this.busquedaControl
      .setValue(
        '',
      );
  }


  recargar():
    void {

    const actual =
      this.busquedaControl
        .value;


    this.busquedaControl
      .setValue(
        actual === ''
          ? ' '
          : '',
      );


    queueMicrotask(
      () => {

        this.busquedaControl
          .setValue(
            actual.trim(),
          );
      },
    );
  }


  obtenerIniciales(
    empresa:
      EmpresaPlataforma,
  ): string {

    const texto =
      empresa.nombreComercial
      ||
      empresa.razonSocial;


    return texto
      .trim()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (item) =>
          item
            .charAt(
              0,
            )
            .toUpperCase(),
      )
      .join('');
  }


  formatearFecha(
    fecha:
      string | null,
  ): string {

    if (!fecha) {

      return '—';
    }


    const fechaBase =
      fecha
        .substring(
          0,
          10,
        );


    const partes =
      fechaBase
        .split(
          '-',
        );


    if (
      partes.length !==
      3
    ) {

      return fecha;
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}