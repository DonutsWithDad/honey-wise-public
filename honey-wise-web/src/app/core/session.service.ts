import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { UserService } from './user.service';

/** How often we re-evaluate the session (ms). */
const CHECK_INTERVAL_MS = 60_000;

/**
 * The session is considered "active" if the user has interacted within this
 * window. Beyond it we treat them as idle and let the token lapse.
 */
const IDLE_THRESHOLD_MS = 5 * 60_000;

/**
 * Refresh the token once it's within this window of expiring (and the user is
 * active). Deliberately larger than the check interval so the window can't be
 * skipped, and larger than the idle threshold so a still-active user is always
 * renewed before the token lapses.
 */
const REFRESH_WINDOW_MS = 10 * 60_000;

/** DOM events that count as the user interacting with the app. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'mousemove'] as const;

/**
 * Keeps a signed-in user's session alive while they're actively using the app and
 * cleanly ends it when they're not.
 *
 * - Activity refresh: while the user is interacting, the token is re-issued once it
 *   passes the halfway point of its lifetime, so an active session never lapses.
 * - Idle timeout: if the user stops interacting, no refresh happens; once the token
 *   expires we sign them out and send them to the session-expired page.
 *
 * Activated by being injected in the app shell; it wires/unwires itself off the
 * auth state, so nothing else needs to start or stop it.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  private lastActivity = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;
  private readonly onActivity = () => (this.lastActivity = Date.now());

  constructor() {
    // Start monitoring when authenticated, tear it down on sign-out.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  private start(): void {
    if (this.intervalId !== null) {
      return;
    }
    this.lastActivity = Date.now();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, this.onActivity, { passive: true });
    }
    this.intervalId = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
  }

  private stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, this.onActivity);
    }
  }

  private tick(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    // Idle past expiry: end the session and surface the timeout page.
    if (this.auth.isExpired()) {
      this.expire();
      return;
    }

    const isActive = Date.now() - this.lastActivity < IDLE_THRESHOLD_MS;
    if (isActive && this.shouldRefresh()) {
      this.doRefresh();
    }
  }

  /** Refresh only once the token is close to expiring, to avoid needless churn. */
  private shouldRefresh(): boolean {
    return this.auth.msUntilExpiry() < REFRESH_WINDOW_MS;
  }

  private doRefresh(): void {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    this.auth.refresh().subscribe({
      next: () => (this.refreshing = false),
      // A failed refresh (e.g. the token lapsed first) is handled by the 401
      // interceptor; just release the guard here.
      error: () => (this.refreshing = false),
    });
  }

  /** Sign out and route to the session-expired page. */
  expire(): void {
    this.stop();
    this.auth.logout();
    this.users.clear();
    this.router.navigate(['/session-expired']);
  }
}
