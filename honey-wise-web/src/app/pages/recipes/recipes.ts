import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { RecipeService } from '../../core/recipe.service';
import { RecipeSummary } from '../../core/recipe.models';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

/** Which layout the recipe list is rendered in. */
type RecipeView = 'cards' | 'table';

/**
 * Recipe Book landing page: lists the signed-in user's recipes with search and
 * filtering (by name, honey type, contained ingredient and yeast type), a
 * card/table view toggle, and actions to create, edit, export and delete each one.
 */
@Component({
  selector: 'app-recipes',
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss',
})
export class Recipes {
  private readonly recipeService = inject(RecipeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly recipes = signal<RecipeSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly view = signal<RecipeView>('cards');

  /** Free-text and dropdown filter state, all applied together (AND). */
  protected readonly nameFilter = signal('');
  protected readonly ingredientFilter = signal('');
  protected readonly honeyFilter = signal('');
  protected readonly yeastFilter = signal('');

  protected readonly tableColumns = ['name', 'honey', 'yeast', 'updated', 'actions'];

  /** Longest card title shown before it's truncated with an ellipsis. */
  protected readonly titleMaxLength = 25;

  /** Distinct honey types across all recipes, for the Honey Type dropdown. */
  protected readonly honeyOptions = computed(() =>
    this.distinctValues((r) => this.ingredientName(r, 'honey')),
  );

  /** Distinct yeast types across all recipes, for the Yeast Type dropdown. */
  protected readonly yeastOptions = computed(() =>
    this.distinctValues((r) => this.ingredientName(r, 'yeast')),
  );

  /** Recipes narrowed by every active filter. */
  protected readonly filteredRecipes = computed(() => {
    const name = this.nameFilter().trim().toLowerCase();
    const ingredient = this.ingredientFilter().trim().toLowerCase();
    const honey = this.honeyFilter();
    const yeast = this.yeastFilter();

    return this.recipes().filter((recipe) => {
      if (name && !recipe.name.toLowerCase().includes(name)) {
        return false;
      }
      if (
        ingredient &&
        !recipe.ingredients.some((i) => i.name.toLowerCase().includes(ingredient))
      ) {
        return false;
      }
      if (honey && this.ingredientName(recipe, 'honey') !== honey) {
        return false;
      }
      if (yeast && this.ingredientName(recipe, 'yeast') !== yeast) {
        return false;
      }
      return true;
    });
  });

  /** True when any filter is narrowing the list. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.nameFilter().trim() ||
      !!this.ingredientFilter().trim() ||
      !!this.honeyFilter() ||
      !!this.yeastFilter(),
  );

  constructor() {
    this.load();
  }

  /** Card title clipped to {@link titleMaxLength}, with a trailing ellipsis. */
  protected displayName(name: string): string {
    return name.length > this.titleMaxLength
      ? `${name.slice(0, this.titleMaxLength).trimEnd()}…`
      : name;
  }

  /** Name of the first ingredient in the given category (e.g. Honey, Yeast). */
  protected ingredientName(recipe: RecipeSummary, category: string): string {
    return (
      recipe.ingredients.find((i) => i.category?.toLowerCase() === category)?.name ?? ''
    );
  }

  protected clearFilters(): void {
    this.nameFilter.set('');
    this.ingredientFilter.set('');
    this.honeyFilter.set('');
    this.yeastFilter.set('');
  }

  private distinctValues(select: (r: RecipeSummary) => string): string[] {
    const values = new Set<string>();
    for (const recipe of this.recipes()) {
      const value = select(recipe).trim();
      if (value) {
        values.add(value);
      }
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }

  private load(): void {
    this.loading.set(true);
    this.recipeService.list().subscribe({
      next: (recipes) => {
        this.recipes.set(recipes);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
      },
    });
  }

  protected exportRecipe(recipe: RecipeSummary): void {
    this.recipeService.export(recipe.id).subscribe({
      next: (blob) => this.downloadBlob(blob, `${recipe.name || 'recipe'}.xml`),
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 }),
    });
  }

  protected confirmDelete(recipe: RecipeSummary): void {
    const data: ConfirmDialogData = {
      title: 'Delete recipe?',
      message: `"${recipe.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '360px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.delete(recipe);
        }
      });
  }

  private delete(recipe: RecipeSummary): void {
    this.recipeService.delete(recipe.id).subscribe({
      next: () => {
        this.recipes.update((list) => list.filter((r) => r.id !== recipe.id));
        this.snackBar.open('Recipe deleted.', 'Dismiss', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 }),
    });
  }

  /** Triggers a browser download for a Blob without leaving the page. */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server. Is the API running?';
    }
    return typeof err.error === 'string' && err.error.trim()
      ? err.error.trim()
      : 'Something went wrong. Please try again.';
  }
}
