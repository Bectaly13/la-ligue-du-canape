import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline } from 'ionicons/icons';

import { AnnouncementService } from 'src/app/services/announcement-service';
import { ThemeService } from 'src/app/services/theme-service';

import { HeaderComponent } from 'src/app/components/header/header.component';

// Outil admin : édition du message broadcast affiché sur l'accueil de tous les joueurs. Route /admin/broadcast.
@Component({
  selector: 'app-admin-broadcast',
  templateUrl: './admin-broadcast.page.html',
  styleUrls: ['./admin-broadcast.page.scss'],
  imports: [IonContent, IonHeader, FormsModule, HeaderComponent]
})
export class AdminBroadcastPage implements ViewWillEnter {

  content = "";
  loading = true;
  saving = false;
  saved = false;
  error = "";

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private announcement: AnnouncementService,
    private router: Router
  ) {
    addIcons({ "home-outline": homeOutline });
  }

  // Retour au hub admin (flèche à gauche).
  goBack() {
    this.router.navigateByUrl("/admin");
  }

  // Sortie vers l'accueil (bouton à droite, commun à toutes les pages admin).
  goHome() {
    this.router.navigateByUrl("/home");
  }

  // Toute édition invalide l'indicateur « enregistré ».
  onEdit() {
    this.saved = false;
    this.error = "";
  }

  // Enregistre le message (route admin). Affiche une confirmation ou une erreur.
  async save() {
    const text = this.content.trim();
    if (this.saving || !text) {
      return;
    }
    this.saving = true;
    this.saved = false;
    this.error = "";

    const result = await this.announcement.setAnnouncement(text);
    this.saving = false;

    if (result) {
      this.content = result.content;
      this.saved = true;
    } else {
      this.error = "Échec de l'enregistrement.";
    }
  }

  // Charge le message courant pour pré-remplir le champ.
  private async load() {
    this.loading = true;
    const current = await this.announcement.getAnnouncement();
    this.content = current?.content ?? "";
    this.loading = false;
  }
}
