import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, interval, map, startWith } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail = this.authService.getUserEmail();

  readonly remainingMs$ = combineLatest([
    this.authService.expiresAt$,
    interval(1000).pipe(startWith(0))
  ]).pipe(
    map(([expiresAt]) => {
      if (!expiresAt) {
        return 0;
      }

      return Math.max(0, expiresAt - Date.now());
    })
  );

  logout(): void {
    this.authService.logout(true);
  }

  simulateBackendHit(): void {
    this.authService.markBackendHit();
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  formatRemaining(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
