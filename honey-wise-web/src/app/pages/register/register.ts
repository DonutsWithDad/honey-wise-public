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
import { CreateUserRequest } from '../../core/models';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly submitting = signal(false);
  protected readonly hidePassword = signal(true);

  // lastName, userName and password are required by the API; the rest are optional.
  protected readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: ['', Validators.required],
    userName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', Validators.email],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload = this.buildPayload();

    this.auth.register(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open('Account created — please sign in.', 'Dismiss', { duration: 5000 });
        this.router.navigate(['/login']);
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

  /** Drop empty optional fields so we don't send blank strings to the API. */
  private buildPayload(): CreateUserRequest {
    const { firstName, lastName, userName, email, password } = this.form.getRawValue();
    return {
      lastName,
      userName,
      password,
      ...(firstName ? { firstName } : {}),
      ...(email ? { email } : {}),
    };
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server. Is the API running?';
    }
    return typeof err.error === 'string' && err.error.trim()
      ? err.error.trim()
      : 'Could not create the account. Please try again.';
  }
}
