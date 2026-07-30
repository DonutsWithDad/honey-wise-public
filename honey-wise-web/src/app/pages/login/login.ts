import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly submitting = signal(false);
  protected readonly hidePassword = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.snackBar.open(this.errorMessage(err), 'Dismiss', { duration: 5000 });
      },
    });
  }

  protected togglePassword(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server. Is the API running?';
    }
    // The API returns a plain-text message on a 400 (e.g. invalid credentials).
    return typeof err.error === 'string' && err.error.trim()
      ? err.error.trim()
      : 'Sign in failed. Please try again.';
  }
}
