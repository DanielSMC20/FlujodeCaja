import { ChangeDetectionStrategy, Component } from '@angular/core';

import {  FloatingFilterDisplayParams,  TextFilterModel,} from 'ag-grid-community';

type ParametrosSelectFloatingFilter = FloatingFilterDisplayParams<
  unknown,
  unknown,
  TextFilterModel
> & {
  valores: () => string[];

  placeholder?: string;
};

@Component({
  selector: 'app-select-floating-filter',

  standalone: true,

  template: `
    <select
      class="h-8 w-full rounded-lg border border-slate-300 bg-white
        px-2
        text-xs
        text-slate-700
        outline-none
        focus:border-blue-500
      "
      [value]="valorSeleccionado"
      (change)="cambiarValor($event)"
    >
      <option value="">
        {{ placeholder }}
      </option>

      @for (opcion of opciones; track opcion) {
        <option [value]="opcion">
          {{ opcion }}
        </option>
      }
    </select>
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectFloatingFilterComponent {
  private params: ParametrosSelectFloatingFilter | null = null;

  opciones: string[] = [];

  valorSeleccionado = '';

  placeholder = 'Todos';

  agInit(params: ParametrosSelectFloatingFilter): void {
    this.params = params;

    this.actualizar(params);
  }

  refresh(params: ParametrosSelectFloatingFilter): void {
    this.params = params;

    this.actualizar(params);
  }

  cambiarValor(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;

    this.valorSeleccionado = valor;

    if (!valor) {
      this.params?.onModelChange(null);

      return;
    }

    const modelo: TextFilterModel = {
      filterType: 'text',

      type: 'equals',

      filter: valor,
    };

    this.params?.onModelChange(modelo);
  }

  private actualizar(params: ParametrosSelectFloatingFilter): void {
    this.placeholder = params.placeholder ?? 'Todos';

    this.opciones = params.valores().filter((valor) => Boolean(valor?.trim()));

    this.valorSeleccionado = params.model?.filter ?? '';
  }
}
