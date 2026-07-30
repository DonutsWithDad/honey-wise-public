import { Injectable, computed, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'honeywise.theme';

/**
 * Owns the app's light/dark appearance. The user's explicit choice is persisted
 * in localStorage; on first visit (no stored choice) we follow the OS setting.
 * An `effect` keeps the `<html class="dark">` flag in sync with the signal, and
 * the global theme in `styles.scss` swaps Material's system colors off that class.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.initialTheme());
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    effect(() => this.applyTheme(this._theme()));
  }

  toggle(): void {
    this.set(this._theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private initialTheme(): Theme {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
