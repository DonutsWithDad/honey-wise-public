import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { ChangePasswordRequest, UpdateUserNameRequest, UserProfile } from './models';

/**
 * Talks to the HoneyWise API's profile endpoints (`/Users/me`). Mirrors
 * `RecipeService`: a root-provided singleton over `HttpClient`; the JWT is
 * attached by `authTokenInterceptor`, so nothing here deals with auth headers.
 *
 * Caches the loaded profile in a signal so the app shell can show the current
 * username without re-fetching, and keeps it fresh after a username change.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly _profile = signal<UserProfile | null>(null);
  readonly profile = this._profile.asReadonly();

  /** Load (and cache) the signed-in user's profile. */
  load(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.baseUrl}/Users/me`)
      .pipe(tap((profile) => this._profile.set(profile)));
  }

  /** Change the username (204). Updates the cached profile on success. */
  updateUserName(userName: string): Observable<void> {
    const body: UpdateUserNameRequest = { userName };
    return this.http
      .put<void>(`${this.baseUrl}/Users/me/username`, body)
      .pipe(tap(() => this._profile.update((p) => (p ? { ...p, userName } : p))));
  }

  /** Change the password (204). */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const body: ChangePasswordRequest = { currentPassword, newPassword };
    return this.http.put<void>(`${this.baseUrl}/Users/me/password`, body);
  }

  /** Drop the cached profile, e.g. on sign-out. */
  clear(): void {
    this._profile.set(null);
  }
}
