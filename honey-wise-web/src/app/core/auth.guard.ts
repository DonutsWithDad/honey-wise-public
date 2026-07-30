import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Route guard that keeps unauthenticated visitors out of protected pages,
 * redirecting them to sign in. Applied to the recipe routes; reusable for any
 * future page that requires a signed-in user.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    // A token that's present but past its expiry (e.g. a deep-link after the tab
    // sat idle) shouldn't silently bounce to a fresh sign-in — clear it and send
    // the user to the session-expired page so they know what happened.
    if (auth.isExpired()) {
      auth.logout();
      return router.createUrlTree(['/session-expired']);
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};
