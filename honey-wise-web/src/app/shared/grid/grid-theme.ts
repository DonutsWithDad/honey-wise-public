import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid's Quartz theme tinted with the app's Material system tokens. The
 * `--mat-sys-*` variables are redefined under `html.dark` (see `styles.scss`), so
 * the grid follows the light/dark toggle without switching themes in code.
 */
export const appGridTheme = themeQuartz.withParams({
  accentColor: 'var(--mat-sys-primary)',
  backgroundColor: 'var(--mat-sys-surface)',
  foregroundColor: 'var(--mat-sys-on-surface)',
  borderColor: 'var(--mat-sys-outline-variant)',
  headerBackgroundColor: 'var(--mat-sys-surface-container-low)',
  fontFamily: 'inherit',
  // Scrollbars and native inputs follow the `color-scheme` set on <html>.
  browserColorScheme: 'inherit',
});
