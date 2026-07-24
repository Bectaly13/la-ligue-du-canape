import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, clipboardOutline, gitNetworkOutline, homeOutline, megaphoneOutline } from 'ionicons/icons';

import { AdminService } from 'src/app/services/admin-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { ThemeService } from 'src/app/services/theme-service';

import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

import dayjs from 'src/app/utils/dayjs';

// Hub de l'espace admin (l'équivalent admin de l'accueil) : redirige vers les outils, chacun en /admin/xxx.
// Un sélecteur de compétition en tête permet d'afficher, sur la carte, le nombre de matchs à valider.
@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [IonContent, IonHeader, IonIcon, CompetitionSelectorComponent, HeaderComponent]
})
export class AdminPage implements ViewWillEnter {

  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;

  // Nombre de matchs en attente d'un résultat pour la compétition sélectionnée (0 = indicateur masqué).
  pendingCount = 0;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private admin: AdminService,
    private competition: CompetitionService,
    private router: Router
  ) {
    addIcons({ "chevron-forward": chevronForward, "clipboard-outline": clipboardOutline, "git-network-outline": gitNetworkOutline, "home-outline": homeOutline, "megaphone-outline": megaphoneOutline });
  }

  // Ressort de l'espace admin vers l'accueil (bouton à droite du header).
  goHome() {
    this.router.navigateByUrl("/home");
  }

  goToResults() {
    this.router.navigateByUrl("/admin/results");
  }

  goToBracket() {
    this.router.navigateByUrl("/admin/bracket");
  }

  goToBroadcast() {
    this.router.navigateByUrl("/admin/broadcast");
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadPending();
  }

  // Charge les compétitions, garantit une sélection, puis le compteur de matchs à valider.
  private async load() {
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadPending();
  }

  // Compte les matchs JOUÉS (coup d'envoi passé) mais sans résultat saisi, pour la compétition sélectionnée.
  private async loadPending() {
    if (this.selectedCompetitionId === null) {
      this.pendingCount = 0;
      return;
    }
    const matches = await this.admin.getMatches(this.selectedCompetitionId);
    this.pendingCount = matches.filter((m) => m.status !== "finished" && !dayjs(m.kickoff_at).isAfter(dayjs())).length;
  }
}
