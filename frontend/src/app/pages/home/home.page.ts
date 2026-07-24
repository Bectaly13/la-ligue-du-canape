import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, megaphoneOutline } from 'ionicons/icons';

import { Announcement, AnnouncementService } from 'src/app/services/announcement-service';
import { ChampionBet, ChampionBetService } from 'src/app/services/champion-bet-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { Match, MatchService } from 'src/app/services/match-service';
import { NotificationService } from 'src/app/services/notification-service';
import { PredictionContext, PredictionService } from 'src/app/services/prediction-service';
import { ThemeService } from 'src/app/services/theme-service';
import { User, UserService } from 'src/app/services/user-service';

import { ChampionTeamOptionComponent } from 'src/app/components/champion-team-option/champion-team-option.component';
import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { CountdownComponent } from 'src/app/components/countdown/countdown.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { MatchItemComponent } from 'src/app/components/match-item/match-item.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';
import { PredictionModalComponent } from 'src/app/components/prediction-modal/prediction-modal.component';

import { plural } from 'src/app/utils/plural';

// Accueil : hub principal. Salutation + broadcast + sélecteur de compétition, puis « Mes pronos »
// (indicateur de pronos à faire), l'aperçu des prochains matchs, et — avant le début d'une compétition —
// le pari « vainqueur » avec compte à rebours.
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonContent, IonHeader, IonIcon, ChampionTeamOptionComponent, CompetitionSelectorComponent, CountdownComponent, HeaderComponent, MatchItemComponent, NavbarComponent, PredictionModalComponent]
})
export class HomePage implements ViewWillEnter {

  // Accord en nombre (0 et ≥ 2 au pluriel).
  readonly plural = plural;

  // Joueur courant (récupéré auprès du serveur via /me).
  user: User | null = null;

  // Message broadcast de l'organisateur (affiché en tête du hub).
  announcement: Announcement | null = null;

  // Compétitions et sélection courante (persistée en local, comme sur les autres pages).
  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;

  // Nombre de matchs restant à pronostiquer pour la compétition sélectionnée (0 = indicateur masqué).
  toPredictCount = 0;

  // Prochain(s) match(s) à venir (le plus proche + ceux au même coup d'envoi, donc simultanés).
  nextMatches: Match[] = [];

  // Pari « vainqueur » de la compétition sélectionnée (module affiché seulement avant le début).
  championBet: ChampionBet | null = null;

  // Modale de prono (ouverte depuis une card de match).
  predictionOpen = false;
  predictionContext: PredictionContext | null = null;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.loadUser();
    await this.loadAnnouncement();
    await this.loadCompetitions();
  }

  constructor(
    private announcementService: AnnouncementService,
    private championBetService: ChampionBetService,
    private competition: CompetitionService,
    private matchService: MatchService,
    private notif: NotificationService,
    private prediction: PredictionService,
    private theme: ThemeService,
    private userService: UserService,
    private router: Router
  ) {
    addIcons({ "chevron-forward": chevronForward, "megaphone-outline": megaphoneOutline });
  }

  goToPredictions() {
    this.router.navigateByUrl("/predictions");
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadCompetitionContent();
  }

  // --- Prono (ouvert depuis une card de prochain match) ---
  async openPrediction(matchId: number) {
    this.predictionContext = await this.prediction.getPrediction(matchId);
    if (this.predictionContext) {
      this.predictionOpen = true;
    }
  }

  closePrediction() {
    this.predictionOpen = false;
  }

  // Après un prono posé/modifié : l'indicateur « à faire » peut avoir changé, on le rafraîchit.
  async onPredictionSaved() {
    this.predictionOpen = false;
    await this.loadToPredictCount();
  }

  // Charge le message broadcast à afficher sur l'accueil.
  private async loadAnnouncement() {
    this.announcement = await this.announcementService.getAnnouncement();
  }

  // Charge les compétitions, garantit une sélection, puis le contenu lié à celle-ci.
  private async loadCompetitions() {
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadCompetitionContent();
  }

  // Contenu dépendant de la compétition sélectionnée : indicateur de pronos + prochains matchs + pari vainqueur.
  private async loadCompetitionContent() {
    await this.loadToPredictCount();
    await this.loadNextMatches();
    await this.loadChampionBet();
    // (Re)planifie les rappels locaux pour cette compétition (fire-and-forget ; sans effet hors natif).
    void this.notif.refreshReminders();
  }

  // Contexte du pari « vainqueur » (module affiché seulement si non verrouillé, cf. template).
  private async loadChampionBet() {
    this.championBet = this.selectedCompetitionId !== null
      ? await this.championBetService.getChampionBet(this.selectedCompetitionId)
      : null;
  }

  // Choix d'un champion : enregistre puis met à jour le pari courant localement.
  async pickChampion(teamId: number) {
    if (this.selectedCompetitionId === null || !this.championBet) {
      return;
    }
    const myBet = await this.championBetService.setChampionBet(this.selectedCompetitionId, teamId);
    if (myBet !== null) {
      this.championBet = { ...this.championBet, myBet };
    }
  }

  // Le compte à rebours a atteint le coup d'envoi : on recharge (le pari passe verrouillé → module masqué).
  async onChampionLockReached() {
    await this.loadChampionBet();
  }

  // Récupère le nombre de matchs à pronostiquer pour la compétition sélectionnée.
  private async loadToPredictCount() {
    if (this.selectedCompetitionId === null) {
      this.toPredictCount = 0;
      return;
    }
    const predictions = await this.prediction.getMyPredictions(this.selectedCompetitionId);
    this.toPredictCount = predictions.toPredict.length;
  }

  // Prochain(s) match(s) : le coup d'envoi à venir le plus proche, et tous ceux à la même heure.
  private async loadNextMatches() {
    if (this.selectedCompetitionId === null) {
      this.nextMatches = [];
      return;
    }
    const upcoming = await this.matchService.getMatches(this.selectedCompetitionId, "upcoming");
    const firstKickoff = upcoming[0]?.kickoff_at ?? null;
    this.nextMatches = firstKickoff ? upcoming.filter((m) => m.kickoff_at === firstKickoff) : [];
  }

  // Charge le profil via /me. Si le token n'est plus valide (identité réinitialisée), retour à l'onboarding.
  private async loadUser() {
    this.user = await this.userService.fetchMe();
    if (!this.user && !(await this.userService.isOnboarded())) {
      await this.router.navigateByUrl("/onboarding", { replaceUrl: true });
    }
  }
}
