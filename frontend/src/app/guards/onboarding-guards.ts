import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserService } from 'src/app/services/user-service';

// Note : les gardes fonctionnelles n'ont pas de constructeur ; l'injection via inject() est la
// seule option ici (exception à la convention « injection dans le constructeur »).

// Autorise l'accès si l'appareil possède déjà un compte ; sinon, redirige vers l'onboarding.
export const onboardedGuard: CanActivateFn = async () => {
  const user = inject(UserService);
  const router = inject(Router);
  return (await user.isOnboarded()) ? true : router.parseUrl("/onboarding");
};

// Réserve l'onboarding aux appareils sans compte ; sinon, renvoie à l'accueil.
export const notOnboardedGuard: CanActivateFn = async () => {
  const user = inject(UserService);
  const router = inject(Router);
  return (await user.isOnboarded()) ? router.parseUrl("/home") : true;
};

// Réserve l'espace admin aux comptes administrateurs. Garde-fou d'UX seulement — le backend impose de
// toute façon requireAdmin sur chaque route sensible. Redirige les non-admins vers l'accueil.
export const adminGuard: CanActivateFn = async () => {
  const user = inject(UserService);
  const router = inject(Router);
  if (!(await user.isOnboarded())) {
    return router.parseUrl("/onboarding");
  }
  const me = user.currentUser ?? (await user.fetchMe());
  return me?.is_admin ? true : router.parseUrl("/home");
};
