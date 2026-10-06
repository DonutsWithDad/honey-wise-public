import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GridViewService } from '../../core/grid-view.service';
import { GridView, GridViewInput } from '../../core/grid-view.models';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog';
import { ViewNameDialog, ViewNameDialogData, ViewNameDialogResult } from './view-name-dialog';

/**
 * Saved-views dropdown for any grid: pick a view, save the current layout as a new
 * named view, overwrite, rename, delete, or choose which view the grid opens with.
 *
 * The menu doesn't know what a layout contains. The host page passes
 * `captureState` to snapshot its current state when saving, and listens to
 * `applyState` to restore one (`null` means "go back to the standard layout").
 * On load, the user's opening (default) view, if any, is applied automatically.
 */
@Component({
  selector: 'app-grid-views-menu',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      mat-stroked-button
      type="button"
      class="views-trigger"
      [matMenuTriggerFor]="menu"
      matTooltip="Saved views"
    >
      <mat-icon>bookmarks</mat-icon>
      <span class="views-trigger-label">{{ active()?.name ?? 'Standard layout' }}</span>
      <mat-icon iconPositionEnd>arrow_drop_down</mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      <button mat-menu-item type="button" (click)="select(null)">
        <mat-icon>{{ activeId() === null ? 'check' : '' }}</mat-icon>
        <span>Standard layout</span>
      </button>
      @for (view of views(); track view.id) {
        <button mat-menu-item type="button" (click)="select(view)">
          <mat-icon>{{ view.id === activeId() ? 'check' : '' }}</mat-icon>
          <span class="views-item-name">{{ view.name }}</span>
          @if (view.isDefault) {
            <mat-icon class="views-item-default" aria-label="Opens by default">star</mat-icon>
          }
        </button>
      }

      <mat-divider />

      <button mat-menu-item type="button" (click)="saveAsNew()">
        <mat-icon>bookmark_add</mat-icon>
        <span>Save as new view…</span>
      </button>
      @if (active(); as view) {
        <button mat-menu-item type="button" (click)="saveChanges(view)">
          <mat-icon>save</mat-icon>
          <span>Save changes to "{{ view.name }}"</span>
        </button>
        <button mat-menu-item type="button" (click)="rename(view)">
          <mat-icon>edit</mat-icon>
          <span>Rename…</span>
        </button>
        <button mat-menu-item type="button" (click)="toggleDefault(view)">
          <mat-icon>{{ view.isDefault ? 'star_outline' : 'star' }}</mat-icon>
          <span>{{ view.isDefault ? 'Stop opening with this view' : 'Open with this view' }}</span>
        </button>
        <button mat-menu-item type="button" (click)="confirmDelete(view)">
          <mat-icon>delete</mat-icon>
          <span>Delete view</span>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .views-trigger-label {
      display: inline-block;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: bottom;
    }

    .views-item-name {
      margin-right: 8px;
    }

    .views-item-default {
      margin: 0 0 0 auto;
      color: var(--mat-sys-primary);
    }
  `,
})
export class GridViewsMenu<TState> implements OnInit {
  private readonly gridViewService = inject(GridViewService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Which grid's views to manage, e.g. "recipes". */
  readonly gridKey = input.required<string>();

  /** Snapshots the host's current layout when saving a view. */
  readonly captureState = input.required<() => TState>();

  /** Emits a view's saved state to restore, or `null` for the standard layout. */
  readonly applyState = output<TState | null>();

  protected readonly views = signal<GridView<TState>[]>([]);
  protected readonly activeId = signal<string | null>(null);
  protected readonly active = computed(
    () => this.views().find((v) => v.id === this.activeId()) ?? null,
  );

  ngOnInit(): void {
    this.reload(() => {
      const opening = this.views().find((v) => v.isDefault);
      if (opening) {
        this.select(opening);
      }
    });
  }

  protected select(view: GridView<TState> | null): void {
    this.activeId.set(view?.id ?? null);
    this.applyState.emit(view?.state ?? null);
  }

  protected saveAsNew(): void {
    this.askName({ title: 'Save view', confirmLabel: 'Save', name: '', showDefault: true }, (result) =>
      this.gridViewService
        .create(this.input(result.name, this.captureState()(), result.isDefault))
        .subscribe({
          next: ({ id }) => {
            this.reload(() => this.activeId.set(id));
            this.notify(`Saved view "${result.name}".`);
          },
          error: (err: HttpErrorResponse) => this.notifyError(err),
        }),
    );
  }

  protected saveChanges(view: GridView<TState>): void {
    this.update(view, this.input(view.name, this.captureState()(), view.isDefault), () =>
      this.notify(`Saved changes to "${view.name}".`),
    );
  }

  protected rename(view: GridView<TState>): void {
    this.askName(
      { title: 'Rename view', confirmLabel: 'Rename', name: view.name, showDefault: false },
      (result) => this.update(view, this.input(result.name, view.state, view.isDefault)),
    );
  }

  protected toggleDefault(view: GridView<TState>): void {
    this.update(view, this.input(view.name, view.state, !view.isDefault), () =>
      this.notify(
        view.isDefault
          ? 'This page will open with the standard layout.'
          : `This page will open with "${view.name}".`,
      ),
    );
  }

  protected confirmDelete(view: GridView<TState>): void {
    const data: ConfirmDialogData = {
      title: 'Delete view?',
      message: `The saved view "${view.name}" will be deleted. Your recipes are not affected.`,
      confirmLabel: 'Delete',
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '360px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.gridViewService.delete(view.id).subscribe({
          next: () => {
            // The layout stays on screen; it's just no longer a saved view.
            if (this.activeId() === view.id) {
              this.activeId.set(null);
            }
            this.reload();
            this.notify(`Deleted view "${view.name}".`);
          },
          error: (err: HttpErrorResponse) => this.notifyError(err),
        });
      });
  }

  private update(view: GridView<TState>, input: GridViewInput<TState>, done?: () => void): void {
    this.gridViewService.update(view.id, input).subscribe({
      next: () => {
        this.reload();
        done?.();
      },
      error: (err: HttpErrorResponse) => this.notifyError(err),
    });
  }

  private reload(done?: () => void): void {
    this.gridViewService.list<TState>(this.gridKey()).subscribe({
      next: (views) => {
        this.views.set(views);
        done?.();
      },
      error: (err: HttpErrorResponse) => this.notifyError(err),
    });
  }

  private askName(data: ViewNameDialogData, then: (result: ViewNameDialogResult) => void): void {
    this.dialog
      .open<ViewNameDialog, ViewNameDialogData, ViewNameDialogResult>(ViewNameDialog, {
        data,
        width: '360px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          then(result);
        }
      });
  }

  private input(name: string, state: TState, isDefault: boolean): GridViewInput<TState> {
    return { gridKey: this.gridKey(), name, state, isDefault };
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 3000 });
  }

  private notifyError(err: HttpErrorResponse): void {
    const message =
      err.status === 0
        ? 'Cannot reach the server. Is the API running?'
        : typeof err.error === 'string' && err.error.trim()
          ? err.error.trim()
          : 'Something went wrong. Please try again.';
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }
}
