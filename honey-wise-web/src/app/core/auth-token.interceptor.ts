import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * Attaches the JWT as a Bearer token to outgoing API requests so future
 * [Authorize]-protected endpoints work automatically. Login/registration run
 * before a token exists, so requests simply go out unauthenticated then.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
