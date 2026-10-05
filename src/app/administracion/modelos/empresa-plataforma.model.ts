export interface EmpresaPlataforma {
  empresaId: number;

  ruc: string;

  razonSocial: string;

  nombreComercial: string;

  monedaBase: number;

  monedaDescripcion: string | null;

  monedaAbreviatura: string | null;

  zonaHoraria: string;

  activa: boolean;

  fechaRegistro: string | null;

  administradorUsuarioId: number | null;

  administradorNombres: string | null;

  administradorApellidos: string | null;

  administradorNombreCompleto: string | null;

  administradorCorreo: string | null;
}


export interface CrearEmpresaPlataformaRequest {
  ruc: string;

  razonSocial: string;

  nombreComercial: string;

  monedaBase: number;

  zonaHoraria: string;

  administrador: {
    nombres: string;

    apellidos: string;

    correo: string;

    passwordTemporal: string;
  };
}


export interface ActualizarEmpresaPlataformaRequest {
  ruc: string;

  razonSocial: string;

  nombreComercial: string;

  monedaBase: number;

  zonaHoraria: string;
}