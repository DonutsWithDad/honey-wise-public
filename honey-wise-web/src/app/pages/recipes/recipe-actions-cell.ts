import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { RecipeSummary } from '../../core/recipe.models';

/** Callbacks the Recipe Book passes in through the column's `cellRendererParams`. */
export interface RecipeActionsCellParams {
  onExport: (recipe: RecipeSummary) => void;
  onDelete: (recipe: RecipeSummary) => void;
}

type Params = ICellRendererParams<RecipeSummary> & RecipeActionsCellParams;

/** AG Grid cell holding a recipe row's Edit / Export / Delete buttons. */
@Component({
  selector: 'app-recipe-actions-cell',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (params(); as p) {
      @if (p.data; as recipe) {
        <a
          mat-icon-button
          [routerLink]="['/recipes', recipe.id, 'edit']"
          aria-label="Edit recipe"
          matTooltip="Edit"
        >
          <mat-icon>edit</mat-icon>
        </a>
        <button
          mat-icon-button
          (click)="p.onExport(recipe)"
          aria-label="Export recipe"
          matTooltip="Export"
        >
          <mat-icon>download</mat-icon>
        </button>
        <button
          mat-icon-button
          (click)="p.onDelete(recipe)"
          aria-label="Delete recipe"
          matTooltip="Delete"
        >
          <mat-icon>delete</mat-icon>
        </button>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      height: 100%;
    }
  `,
})
export class RecipeActionsCell implements ICellRendererAngularComp {
  protected readonly params = signal<Params | null>(null);

  agInit(params: Params): void {
    this.params.set(params);
  }

  refresh(params: Params): boolean {
    this.params.set(params);
    return true;
  }
}
