import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, delay, interval, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly tokenStorageKey = 'fc_access_token';
  private readonly expiryStorageKey = 'fc_expires_at';
  private readonly emailStorageKey = 'fc_user_email';

private readonly inactivityWindowMs =  8 * 60 * 60 * 1000;  
private readonly monitorIntervalMs = 15 * 1000;

  private readonly authenticatedSubject = new BehaviorSubject<boolean>(false);
  readonly authenticated$ = this.authenticatedSubject.asObservable();

  private readonly expiresAtSubject = new BehaviorSubject<number | null>(null);
  readonly expiresAt$ = this.expiresAtSubject.asObservable();

  private readonly userEmailSubject = new BehaviorSubject<string>('');
  readonly userEmail$ = this.userEmailSubject.asObservable();

  private monitorSubscription?: Subscription;

  constructor() {
    this.restoreSession();
    this.startSessionMonitor();
  }

  login(email: string, password: string): Observable<void> {
    void password;

    // Placeholder until backend JWT endpoint is available.
    const token = this.buildMockJwt(email);
    const expiresAt = Date.now() + this.inactivityWindowMs;

    this.setSession(token, expiresAt, email);
    return of(void 0).pipe(delay(500));
  }

  logout(redirectToLogin = true): void {
    this.clearSession();

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

  markBackendHit(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    const renewedExpiry = Date.now() + this.inactivityWindowMs;
    localStorage.setItem(this.expiryStorageKey, renewedExpiry.toString());
    this.expiresAtSubject.next(renewedExpiry);
  }

  private setSession(token: string, expiresAt: number, email: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.expiryStorageKey, expiresAt.toString());
    localStorage.setItem(this.emailStorageKey, email);

    this.authenticatedSubject.next(true);
    this.expiresAtSubject.next(expiresAt);
    this.userEmailSubject.next(email);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.expiryStorageKey);
    localStorage.removeItem(this.emailStorageKey);

    this.authenticatedSubject.next(false);
    this.expiresAtSubject.next(null);
    this.userEmailSubject.next('');
  }

  private restoreSession(): void {
    if (!this.hasValidSession()) {
      this.clearSession();
      return;
    }

    this.authenticatedSubject.next(true);
    this.expiresAtSubject.next(Number(localStorage.getItem(this.expiryStorageKey)));
    this.userEmailSubject.next(localStorage.getItem(this.emailStorageKey) ?? '');
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

  private buildMockJwt(email: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.inactivityWindowMs) / 1000)
    };

    return `${this.base64UrlEncode(JSON.stringify(header))}.${this.base64UrlEncode(JSON.stringify(payload))}.mock-signature`;
  }

  private base64UrlEncode(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
