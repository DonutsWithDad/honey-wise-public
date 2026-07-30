import { Component, computed, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserService } from '../../core/user.service';

/**
 * Account settings: change username, change password, and (placeholder) manage
 * the plan. Plan upgrade is intentionally inert for now — the button is disabled
 * and labelled "coming soon" until billing is wired up.
 */
@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly profile = this.users.profile;
  protected readonly plan = computed(() => this.profile()?.plan ?? 'free');

  protected readonly savingName = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly hideCurrent = signal(true);
  protected readonly hideNew = signal(true);

  protected readonly usernameForm = this.fb.nonNullable.group({
    userName: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Ensure the profile is loaded (the shell usually has it already, but a direct
    // visit/refresh to /profile shouldn't render an empty form).
    if (this.profile()) {
      this.usernameForm.controls.userName.setValue(this.profile()!.userName);
    } else {
      this.users.load().subscribe({
        next: (p) => this.usernameForm.controls.userName.setValue(p.userName),
        error: (err: HttpErrorResponse) =>
          this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 }),
      });
    }
  }

  protected saveUsername(): void {
    if (this.usernameForm.invalid || this.savingName()) {
      this.usernameForm.markAllAsTouched();
      return;
    }

    this.savingName.set(true);
    const userName = this.usernameForm.getRawValue().userName.trim();

    this.users.updateUserName(userName).subscribe({
      next: () => {
        this.savingName.set(false);
        this.snackBar.open('Username updated.', 'Dismiss', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.savingName.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
      },
    });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.users.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.snackBar.open('Password changed.', 'Dismiss', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.savingPassword.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
      },
    });
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
