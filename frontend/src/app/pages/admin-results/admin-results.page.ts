import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline } from 'ionicons/icons';

import { AdminMatch, AdminService } from 'src/app/services/admin-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { ThemeService } from 'src/app/services/theme-service';

import { AdminMatchItemComponent } from 'src/app/components/admin-match-item/admin-match-item.component';
import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ResultModalComponent } from 'src/app/components/result-modal/result-modal.component';

import dayjs from 'src/app/utils/dayjs';

// Segment affiché : matchs à valider ou déjà validés.
type Segment = 'toValidate' | 'validated';

// Outil admin : saisie des résultats d'une compétition. Route /admin/results.
@Component({
  selector: 'app-admin-results',
  templateUrl: './admin-results.page.html',
  styleUrls: ['./admin-results.page.scss'],
  imports: [IonContent, IonHeader, AdminMatchItemComponent, CompetitionSelectorComponent, EmptyStateComponent, HeaderComponent, ResultModalComponent]
})
export class AdminResultsPage implements ViewWillEnter {

  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  matches: AdminMatch[] = [];
  segment: Segment = 'toValidate';

  // Modale de saisie du résultat.
  resultOpen = false;
  resultMatch: AdminMatch | null = null;

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
    addIcons({ "home-outline": homeOutline });
  }

  // À valider : matchs JOUÉS (coup d'envoi passé) mais sans résultat saisi → points pas encore calculés.
  // Les matchs à venir n'y figurent pas (rien à saisir tant qu'ils ne sont pas joués).
  get toValidate(): AdminMatch[] {
    return this.matches.filter((m) => m.status !== "finished" && this.isPlayed(m));
  }

  get validated(): AdminMatch[] {
    return this.matches.filter((m) => m.status === "finished");
  }

  // Coup d'envoi passé (heure de Paris, traitée comme locale, comme partout dans l'app).
  private isPlayed(m: AdminMatch): boolean {
    return !dayjs(m.kickoff_at).isAfter(dayjs());
  }

  // Retour au hub admin (flèche à gauche).
  goBack() {
    this.router.navigateByUrl("/admin");
  }

  // Sortie vers l'accueil (bouton à droite, commun à toutes les pages admin).
  goHome() {
    this.router.navigateByUrl("/home");
  }

  setSegment(segment: Segment) {
    this.segment = segment;
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadMatches();
  }

  // --- Saisie d'un résultat ---
  openResult(match: AdminMatch) {
    this.resultMatch = match;
    this.resultOpen = true;
  }

  closeResult() {
    this.resultOpen = false;
  }

  async onResultSaved() {
    this.resultOpen = false;
    await this.loadMatches();
  }

  // Charge les compétitions, garantit une sélection, puis les matchs de celle-ci.
  // On repart toujours sur « À valider » (Ionic réutilise l'instance de page → sinon le segment resterait
  // sur son dernier état).
  private async load() {
    this.segment = "toValidate";
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadMatches();
  }

  private async loadMatches() {
    this.matches = this.selectedCompetitionId
      ? await this.admin.getMatches(this.selectedCompetitionId)
      : [];
  }
}
