import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  interval,
  map,
  tap,
  throwError,
} from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { EmpresaSesion } from '../../nucleo/modelos/empresa-sesion.model';
import { UsuarioSesion } from '../../nucleo/modelos/usuario-sesion.model';
import { SesionEmpresaService } from '../../nucleo/servicios/sesion-empresa.service';
import { SesionUsuarioService } from '../../nucleo/servicios/sesion-usuario.service';

interface LoginBackendResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: {
    id: number;
    correo: string;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
  };
  empresa: {
    id: number;
    ruc: string | null;
    razonSocial: string;
    nombreComercial: string;
    monedaBase: number;
    monedaBaseDescripcion: string;
    monedaBaseAbreviatura: string;
    zonaHoraria: string;
  };
  roles: string[];
  debeCambiarPassword: boolean;
}

interface ApiErrorResponse {
  message?: string;
}
interface MensajeAuthResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesionEmpresaService = inject(SesionEmpresaService);
  private readonly sesionUsuarioService = inject(SesionUsuarioService);

  private readonly tokenStorageKey = 'fc_access_token_v2';
  private readonly expiryStorageKey = 'fc_expires_at_v2';
  private readonly emailStorageKey = 'fc_user_email_v2';
  private readonly passwordChangeStorageKey = 'fc_password_change_required_v2';

  private readonly inactivityWindowMs = 8 * 60 * 60 * 1000;
  private readonly monitorIntervalMs = 15 * 1000;

  private readonly authenticatedSubject = new BehaviorSubject<boolean>(false);
  readonly authenticated$ = this.authenticatedSubject.asObservable();

  private readonly expiresAtSubject = new BehaviorSubject<number | null>(null);
  readonly expiresAt$ = this.expiresAtSubject.asObservable();

  private readonly userEmailSubject = new BehaviorSubject<string>('');
  readonly userEmail$ = this.userEmailSubject.asObservable();

  private readonly passwordChangeRequiredSubject =
    new BehaviorSubject<boolean>(false);
  readonly passwordChangeRequired$ =
    this.passwordChangeRequiredSubject.asObservable();

  private monitorSubscription?: Subscription;

  constructor() {
    this.restoreSession();
    this.startSessionMonitor();
  }

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<LoginBackendResponse>(`${API_CONFIG.baseUrl}/auth/login`, {
        correo: email.trim().toLowerCase(),
        password,
      })
      .pipe(
        tap((response) => {
          const expiresInMs =
            Number(response.expiresIn) > 0
              ? Number(response.expiresIn) * 1000
              : this.inactivityWindowMs;

          const expiresAt = Date.now() + expiresInMs;

          const empresa: EmpresaSesion = {
            id: response.empresa.id,
            ruc: response.empresa.ruc,
            razonSocial: response.empresa.razonSocial,
            nombreComercial: response.empresa.nombreComercial,
            monedaBase: response.empresa.monedaBase,
            monedaBaseDescripcion: response.empresa.monedaBaseDescripcion,
            monedaBaseAbreviatura: response.empresa.monedaBaseAbreviatura,
            zonaHoraria: response.empresa.zonaHoraria,
            activa: true,
          };

          const usuario: UsuarioSesion = {
            id: response.usuario.id,
            empresaId: response.empresa.id,
            nombres: response.usuario.nombres,
            apellidos: response.usuario.apellidos,
            correo: response.usuario.correo,
            correoVerificado: true,
            activo: true,
            ultimoAcceso: null,
            roles: (response.roles ?? []).map((rol, index) => ({
              id: index + 1,
              codigo: rol,
              nombre: this.formatearRol(rol),
            })),
          };

          this.sesionEmpresaService.establecerEmpresa(empresa);
          this.sesionUsuarioService.establecerUsuario(usuario);
          this.setSession(
            response.accessToken,
            expiresAt,
            response.usuario.correo,
            response.debeCambiarPassword === true,
          );
        }),
        map(() => void 0),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(this.obtenerMensajeError(error))),
        ),
      );
  }
  solicitarRecuperacionPassword(
  correo: string,
): Observable<string> {

  return this.http
    .post<MensajeAuthResponse>(
      `${API_CONFIG.baseUrl}/auth/forgot-password`,
      {
        correo: correo.trim().toLowerCase(),
      },
    )
    .pipe(
      map((response) => response.mensaje),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              this.obtenerMensajeRecuperacion(
                error,
                'No se pudo procesar la solicitud de recuperación.',
              ),
            ),
        ),
      ),
    );
}


restablecerPassword(
  token: string,
  nuevaPassword: string,
  confirmarPassword: string,
): Observable<string> {

  return this.http
    .post<MensajeAuthResponse>(
      `${API_CONFIG.baseUrl}/auth/reset-password`,
      {
        token,
        nuevaPassword,
        confirmarPassword,
      },
    )
    .pipe(
      map((response) => response.mensaje),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              this.obtenerMensajeRecuperacion(
                error,
                'No se pudo restablecer la contraseña.',
              ),
            ),
        ),
      ),
    );
}

  logout(redirectToLogin = true): void {
    this.clearSession();
    this.sesionEmpresaService.limpiarSesion();
    this.sesionUsuarioService.limpiarSesion();

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  getToken(): string | null {
    if (!this.hasValidSession()) {
      this.clearSession();
      return null;
    }

    return localStorage.getItem(this.tokenStorageKey);
  }

  getUserEmail(): string {
    return this.userEmailSubject.value;
  }

  isAuthenticated(): boolean {
    return this.hasValidSession();
  }

  requiereCambioPassword(): boolean {
    return this.passwordChangeRequiredSubject.value;
  }

  marcarPasswordActualizado(): void {
    localStorage.setItem(this.passwordChangeStorageKey, 'false');
    this.passwordChangeRequiredSubject.next(false);
  }

  actualizarTokenRenovado(token: string): void {
    if (!token) {
      return;
    }

    localStorage.setItem(this.tokenStorageKey, token);

    const expiracion = this.obtenerExpiracionJwt(token);
    if (expiracion) {
      localStorage.setItem(this.expiryStorageKey, String(expiracion));
      this.expiresAtSubject.next(expiracion);
    }
  }

  markBackendHit(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    // La expiración real la controla el JWT del backend. Aquí solo mantenemos
    // el estado visual/local de la sesión sin exceder la vigencia original.
    const expiresAtRaw = localStorage.getItem(this.expiryStorageKey);
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;

    if (expiresAt && Number.isFinite(expiresAt)) {
      this.expiresAtSubject.next(expiresAt);
    }
  }

  private setSession(
    token: string,
    expiresAt: number,
    email: string,
    debeCambiarPassword: boolean,
  ): void {
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.expiryStorageKey, expiresAt.toString());
    localStorage.setItem(this.emailStorageKey, email);
    localStorage.setItem(
      this.passwordChangeStorageKey,
      String(debeCambiarPassword),
    );

    this.authenticatedSubject.next(true);
    this.expiresAtSubject.next(expiresAt);
    this.userEmailSubject.next(email);
    this.passwordChangeRequiredSubject.next(debeCambiarPassword);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.expiryStorageKey);
    localStorage.removeItem(this.emailStorageKey);
    localStorage.removeItem(this.passwordChangeStorageKey);

    this.authenticatedSubject.next(false);
    this.expiresAtSubject.next(null);
    this.userEmailSubject.next('');
    this.passwordChangeRequiredSubject.next(false);
  }

  private restoreSession(): void {
    if (!this.hasValidSession()) {
      this.clearSession();
      return;
    }

    this.authenticatedSubject.next(true);
    this.expiresAtSubject.next(Number(localStorage.getItem(this.expiryStorageKey)));
    this.userEmailSubject.next(localStorage.getItem(this.emailStorageKey) ?? '');
    this.passwordChangeRequiredSubject.next(
      localStorage.getItem(this.passwordChangeStorageKey) === 'true',
    );
  }

  private hasValidSession(): boolean {
    const token = localStorage.getItem(this.tokenStorageKey);
    const expiresAtRaw = localStorage.getItem(this.expiryStorageKey);

    if (!token || !expiresAtRaw) {
      return false;
    }

    const expiresAt = Number(expiresAtRaw);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  private startSessionMonitor(): void {
    this.monitorSubscription?.unsubscribe();
    this.monitorSubscription = interval(this.monitorIntervalMs).subscribe(() => {
      if (this.authenticatedSubject.value && !this.hasValidSession()) {
        this.logout(true);
      }
    });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const apiError = error.error as ApiErrorResponse | null;

    if (apiError?.message) {
      return apiError.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }

    return 'No se pudo iniciar sesión.';
  }
  private obtenerMensajeRecuperacion(
  error: HttpErrorResponse,
  mensajePorDefecto: string,
): string {

  const apiError =
    error.error as ApiErrorResponse | null;

  if (apiError?.message) {
    return apiError.message;
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor.';
  }

  return mensajePorDefecto;
}

  private formatearRol(rol: string): string {
    return rol
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
  }

  private obtenerExpiracionJwt(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const base64SinRelleno = payload.replace(/-/g, '+').replace(/_/g, '/');
      const base64 = base64SinRelleno.padEnd(
        base64SinRelleno.length + ((4 - (base64SinRelleno.length % 4)) % 4),
        '=',
      );
      const datos = JSON.parse(atob(base64)) as { exp?: number };
      return datos.exp ? datos.exp * 1000 : null;
    } catch {
      return null;
    }
  }
}
