import {
  ClientSideRowModelModule,
  DateFilterModule,
  GridStateModule,
  ModuleRegistry,
  TextFilterModule,
  TooltipModule,
  ValidationModule,
  provideGlobalGridOptions,
} from 'ag-grid-community';

import { appGridTheme } from './grid-theme';

/**
 * One-time AG Grid setup. It runs when this file is first imported, so any page
 * with a grid should `import '.../shared/grid/grid-setup'`. That keeps the grid
 * code in lazy-loaded page chunks and out of the initial bundle.
 *
 * Only free Community modules are registered (never `ag-grid-enterprise`, which
 * requires a license). Sorting, resizing and pinning are built into the core;
 * add modules here as grids need more features. In dev builds (`ngDevMode`, which
 * production builds strip along with the module), ValidationModule
 * logs a console error naming any module a grid uses but hasn't been registered.
 */
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  DateFilterModule,
  TooltipModule,
  // getState/setState, for saved views (see grid-views-menu.ts).
  GridStateModule,
  ...(typeof ngDevMode === 'undefined' || ngDevMode ? [ValidationModule] : []),
]);

// Defaults every grid in the app starts from. A grid's own options still win; the
// `deep` merge lets it override single `defaultColDef` fields without losing the rest.
provideGlobalGridOptions(
  {
    theme: appGridTheme,
    defaultColDef: {
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 120,
    },
    // Grow with the rows so the page's own scroll container handles scrolling.
    domLayout: 'autoHeight',
    animateRows: true,
    tooltipShowMode: 'whenTruncated',
  },
  'deep',
);
