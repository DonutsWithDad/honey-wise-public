import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { CreateUserRequest, CreateUserResponse, LoginRequest } from './models';

const TOKEN_STORAGE_KEY = 'honeywise.token';

/**
 * Single point of contact with the HoneyWise API's user/auth endpoints, and the
 * owner of the JWT once we have one. The token is persisted in localStorage so a
 * refresh keeps the user signed in; the `authTokenInterceptor` reads it from here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Signal-backed so components/guards can react to auth state.
  private readonly _token = signal<string | null>(this.readStoredToken());
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  /**
   * Authenticate. The API returns the raw JWT as a JSON string on success, or a
   * 400 with a plain message on failure (surfaced as an HttpErrorResponse).
   */
  login(credentials: LoginRequest): Observable<string> {
    return this.http
      .post(`${this.baseUrl}/Users/login`, credentials, { responseType: 'text' })
      .pipe(tap((token) => this.setToken(this.unquote(token))));
  }

  /** Register a new account. Returns the new user's id on success (201). */
  register(user: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${this.baseUrl}/Users`, user);
  }

  logout(): void {
    this.setToken(null);
  }

  /**
   * Re-issues the access token for the still-signed-in user, extending the
   * session. Only succeeds while the current token is valid (the endpoint is
   * behind [Authorize]); an expired token yields a 401 instead.
   */
  refresh(): Observable<string> {
    return this.http
      .post(`${this.baseUrl}/Users/refresh`, null, { responseType: 'text' })
      .pipe(tap((token) => this.setToken(this.unquote(token))));
  }

  /** Absolute expiry time (ms epoch) from the token's `exp` claim, or null. */
  expiresAt(): number | null {
    const exp = this.claims()?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  }

  /** True once the current token's `exp` has passed (or it can't be read). */
  isExpired(): boolean {
    const expiresAt = this.expiresAt();
    return expiresAt === null || Date.now() >= expiresAt;
  }

  /** Milliseconds until the token expires; 0 if already expired/unknown. */
  msUntilExpiry(): number {
    const expiresAt = this.expiresAt();
    return expiresAt === null ? 0 : Math.max(0, expiresAt - Date.now());
  }

  /** Decodes the JWT payload of the current token, or null if there isn't a valid one. */
  private claims(): { exp?: number } | null {
    const token = this._token();
    if (!token) {
      return null;
    }

    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private setToken(token: string | null): void {
    this._token.set(token);
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /**
   * The login endpoint serializes the token via `Ok(string)`, which wraps it in
   * JSON quotes. We request it as text, so strip the surrounding quotes if present.
   */
  private unquote(value: string): string {
    const trimmed = value.trim();
    return trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1)
      : trimmed;
  }
}
