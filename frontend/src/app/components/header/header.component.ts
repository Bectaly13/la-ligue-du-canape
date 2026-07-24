import { Component, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, shieldOutline } from 'ionicons/icons';

import { UserService } from 'src/app/services/user-service';

import { OfflineBannerComponent } from 'src/app/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [IonIcon, OfflineBannerComponent]
})
export class HeaderComponent {
  // Titre affiché, bouton retour optionnel (émet `back`), et action optionnelle à droite :
  // si `actionIcon` est défini, un bouton l'affiche et émet `action` au clic. L'icône doit être
  // enregistrée (addIcons) par la page qui l'utilise — le registre ionicons est global.
  title = input.required<string>();
  showBack = input<boolean>(false);
  actionIcon = input<string>("");
  // Colore le bouton d'action en accent (ex. le bouton « accueil » de l'espace admin, assorti au bouclier).
  actionAccent = input<boolean>(false);
  back = output<void>();
  action = output<void>();

  constructor(
    private userService: UserService,
    private router: Router
  ) {
    addIcons({ "arrow-back": arrowBack, "shield-outline": shieldOutline });
  }

  // Le header étant partagé, il expose lui-même l'accès admin : un bouclier apparaît (à droite) pour
  // le seul joueur admin, sauf sur les pages admin elles-mêmes (on en ressort via leur bouton « accueil »).
  get showAdminShield(): boolean {
    return !!this.userService.currentUser?.is_admin && !this.router.url.startsWith("/admin");
  }

  goToAdmin() {
    this.router.navigateByUrl("/admin");
  }

  onBack() {
    this.back.emit();
  }

  onAction() {
    this.action.emit();
  }
}
