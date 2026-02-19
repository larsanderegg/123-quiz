import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.userProfile$.pipe(
    take(1),
    map(userProfile => {
      // Not authenticated
      if (!userProfile) {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url }
        });
      }

      // Authenticated but not admin
      if (!userProfile.isAdmin) {
        return router.createUrlTree(['/unauthorized']);
      }

      // Authenticated and admin
      return true;
    })
  );
};
