import { Component } from '@angular/core';

// Petit badge « Admin » réutilisable (card d'identité, liste des membres). Sa hauteur épouse celle de la
// ligne de texte voisine (via align-self: stretch dans la zone flex partagée) → sa taille est contextuelle,
// pas fixe. « Admin » est centré verticalement dans la bulle.
@Component({
  selector: 'app-admin-badge',
  template: '<span class="admin-badge">Admin</span>',
  styles: [`
    :host {
      display: inline-flex;
      flex-shrink: 0;
      align-self: stretch;
    }

    .admin-badge {
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
      font-size: 11px;
      font-weight: 700;
      color: var(--app-accent);
      background: var(--app-accent-soft);
      border-radius: var(--app-radius-full);
    }
  `]
})
export class AdminBadgeComponent {}
