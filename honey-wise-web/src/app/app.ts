import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { UserService } from './core/user.service';
import { SessionService } from './core/session.service';

/**
 * Application shell: a persistent top toolbar + collapsible side navigation that
 * wrap every routed page. The toolbar carries the brand, a dark-mode toggle and
 * (when signed in) a profile menu; the sidenav lists the app's sections. Both are
 * only shown to authenticated users — the login/register/home screens render on
 * their own.
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  // Injected for its side effect: it monitors auth state and keeps the session
  // alive while the user is active, ending it on the timeout page when idle.
  private readonly session = inject(SessionService);

  protected readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  protected readonly isDark = this.theme.isDark;
  protected readonly profile = this.users.profile;

  /** Whether the sidenav drawer is open. Defaults open on desktop-width screens. */
  protected readonly sidenavOpen = signal(window.innerWidth >= 960);

  /** Falls back to a generic label until the profile has loaded. */
  protected readonly displayName = computed(() => this.profile()?.userName ?? 'Account');

  constructor() {
    // Load the profile whenever we become authenticated, and clear it on sign-out,
    // so the toolbar's profile menu always reflects the current user.
    effect(() => {
      if (this.isAuthenticated()) {
        if (!this.profile()) {
          this.users.load().subscribe({ error: () => {} });
        }
      } else {
        this.users.clear();
      }
    });
  }

  protected toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected logout(): void {
    this.auth.logout();
    this.users.clear();
    this.router.navigate(['/login']);
  }
}
