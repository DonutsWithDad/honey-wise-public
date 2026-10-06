import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ViewNameDialogData {
  title: string;
  confirmLabel: string;
  name: string;
  /** Offer the "Open with this view" checkbox (only when saving a new view). */
  showDefault: boolean;
}

export interface ViewNameDialogResult {
  name: string;
  isDefault: boolean;
}

/** Asks for a saved view's name; closes with the result, or undefined if cancelled. */
@Component({
  selector: 'app-view-name-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <form (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="view-name-field">
          <mat-label>View name</mat-label>
          <input
            matInput
            name="name"
            [(ngModel)]="name"
            maxlength="60"
            required
            cdkFocusInitial
          />
          <mat-hint align="end">{{ name.length }} / 60</mat-hint>
        </mat-form-field>
        @if (data.showDefault) {
          <mat-checkbox name="isDefault" [(ngModel)]="isDefault">
            Open with this view
          </mat-checkbox>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="!name.trim()">
          {{ data.confirmLabel }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .view-name-field {
      width: 100%;
    }
  `,
})
export class ViewNameDialog {
  protected readonly dialogRef = inject(MatDialogRef<ViewNameDialog, ViewNameDialogResult>);
  protected readonly data = inject<ViewNameDialogData>(MAT_DIALOG_DATA);

  protected name = this.data.name;
  protected isDefault = false;

  protected save(): void {
    const name = this.name.trim();
    if (name) {
      this.dialogRef.close({ name, isDefault: this.isDefault });
    }
  }
}
