import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { SessionService } from './session.service';

/**
 * Catches 401s from the API — the server rejecting our token because it has
 * expired or is otherwise invalid — and ends the session cleanly by routing to
 * the session-expired page. This is the safety net behind `SessionService`'s
 * proactive checks: it covers a token the server rejects between our own polls.
 *
 * Only acts when we currently believe we're signed in, so unauthenticated
 * requests (login, register) surface their errors normally.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const session = inject(SessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.isAuthenticated()) {
        session.expire();
      }
      return throwError(() => error);
    }),
  );
};
