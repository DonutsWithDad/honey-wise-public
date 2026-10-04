import { Injectable, signal } from '@angular/core';

const NAV_COLLAPSED_KEY = 'honeywise.navCollapsed';
const FILTERS_COLLAPSED_KEY = 'honeywise.filtersCollapsed';

/**
 * Owns the collapsed/expanded state of the app's side panels: the main navigation
 * rail and the Recipe Book's filter panel. Each choice is persisted in
 * localStorage so the layout survives a reload.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Main sidenav shows icons only. Defaults collapsed on narrow screens. */
  readonly navCollapsed = signal(this.read(NAV_COLLAPSED_KEY, window.innerWidth < 960));

  /** Recipe Book filter panel is shrunk to its icon rail. */
  readonly filtersCollapsed = signal(this.read(FILTERS_COLLAPSED_KEY, false));

  toggleNav(): void {
    this.navCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem(NAV_COLLAPSED_KEY, String(this.navCollapsed()));
  }

  toggleFilters(): void {
    this.filtersCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem(FILTERS_COLLAPSED_KEY, String(this.filtersCollapsed()));
  }

  private read(key: string, fallback: boolean): boolean {
    const stored = localStorage.getItem(key);
    return stored === 'true' || stored === 'false' ? stored === 'true' : fallback;
  }
}
