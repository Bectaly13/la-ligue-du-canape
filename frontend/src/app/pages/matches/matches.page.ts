import { Component } from '@angular/core';
import { IonContent, IonHeader, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, footballOutline, gitNetworkOutline } from 'ionicons/icons';

import { BracketData, BracketService } from 'src/app/services/bracket-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { GroupService, GroupView } from 'src/app/services/group-service';
import { Match, MatchService, MatchWhen } from 'src/app/services/match-service';
import { PredictionContext, PredictionService } from 'src/app/services/prediction-service';
import { ThemeService } from 'src/app/services/theme-service';

import { BracketComponent } from 'src/app/components/bracket/bracket.component';
import { BracketCircularComponent } from 'src/app/components/bracket-circular/bracket-circular.component';
import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { GroupStandingsComponent } from 'src/app/components/group-standings/group-standings.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { MatchItemComponent } from 'src/app/components/match-item/match-item.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';
import { PredictionModalComponent } from 'src/app/components/prediction-modal/prediction-modal.component';

import dayjs from 'src/app/utils/dayjs';

// Un jour et ses matchs (vue Calendrier).
interface MatchDay {
  date: string;    // "YYYY-MM-DD"
  label: string;   // "vendredi 25 septembre"
  matches: Match[];
}

// Vue affichée dans l'onglet Matchs.
type MatchView = 'calendar' | 'groups' | 'bracket';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.page.html',
  styleUrls: ['./matches.page.scss'],
  imports: [IonContent, IonHeader, IonIcon, BracketComponent, BracketCircularComponent, CompetitionSelectorComponent, EmptyStateComponent, GroupStandingsComponent, HeaderComponent, MatchItemComponent, NavbarComponent, PredictionModalComponent]
})
export class MatchesPage implements ViewWillEnter {

  // Contexte compétition + vue active.
  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  view: MatchView = 'calendar';
  loading = true;

  // Vue Calendrier : filtre temporel, jours ayant des matchs, index du jour affiché.
  when: MatchWhen = 'upcoming';
  days: MatchDay[] = [];
  currentIndex = 0;

  // Vue Groupes : poules (chargées à la demande) et poule sélectionnée.
  groups: GroupView[] = [];
  selectedGroupId: number | null = null;
  private groupsLoaded = false;

  // Vue Bracket : structure KO (chargée à la demande) et mode d'affichage (arbre / cercle).
  bracket: BracketData | null = null;
  bracketMode: 'tree' | 'circle' = 'tree';
  private bracketLoaded = false;

  // Modale de prono.
  predictionOpen = false;
  predictionContext: PredictionContext | null = null;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private competition: CompetitionService,
    private matchService: MatchService,
    private groupService: GroupService,
    private bracketService: BracketService,
    private prediction: PredictionService
  ) {
    addIcons({ "chevron-back": chevronBack, "chevron-forward": chevronForward, "football-outline": footballOutline, "git-network-outline": gitNetworkOutline });
  }

  // --- Vue active ---
  async setView(view: MatchView) {
    if (this.view === view) {
      return;
    }
    this.view = view;
    if (view === 'groups' && !this.groupsLoaded) {
      this.loading = true;
      await this.loadGroups();
      this.loading = false;
    }
    if (view === 'bracket' && !this.bracketLoaded) {
      this.loading = true;
      await this.loadBracket();
      this.loading = false;
    }
  }

  // --- Vue Calendrier ---
  get currentDay(): MatchDay | null {
    return this.days[this.currentIndex] ?? null;
  }

  get canPrev(): boolean {
    return this.currentIndex > 0;
  }

  get canNext(): boolean {
    return this.currentIndex < this.days.length - 1;
  }

  prev() {
    if (this.canPrev) {
      this.currentIndex--;
    }
  }

  next() {
    if (this.canNext) {
      this.currentIndex++;
    }
  }

  // Bascule entre « à venir » et « joués ».
  async setWhen(when: MatchWhen) {
    if (this.when === when) {
      return;
    }
    this.when = when;
    this.loading = true;
    await this.loadMatches();
    this.loading = false;
  }

  // --- Vue Groupes ---
  get selectedGroup(): GroupView | null {
    return this.groups.find((g) => g.id === this.selectedGroupId) ?? null;
  }

  selectGroup(id: number) {
    this.selectedGroupId = id;
  }

  // --- Vue Bracket ---
  setBracketMode(mode: 'tree' | 'circle') {
    this.bracketMode = mode;
  }

  // La vue cercle n'a de sens que si le tableau est entièrement linéaire (aucun tour tiré au sort) ;
  // sinon la page affiche un empty-state dédié à la place du cercle.
  get bracketLinear(): boolean {
    return !!this.bracket && this.bracket.rounds.every((round) => !round.drawnEntry);
  }

  // --- Prono ---
  // Ouvre la modale de prono pour un match : charge son contexte (cotes, prono existant) puis affiche.
  async openPrediction(matchId: number) {
    this.predictionContext = await this.prediction.getPrediction(matchId);
    if (this.predictionContext) {
      this.predictionOpen = true;
    }
  }

  closePrediction() {
    this.predictionOpen = false;
  }

  onPredictionSaved() {
    this.predictionOpen = false;
  }

  // Changement de compétition : recharge le calendrier et invalide les groupes (rechargés si besoin).
  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    this.loading = true;
    await this.loadMatches();
    this.groupsLoaded = false;
    this.groups = [];
    this.selectedGroupId = null;
    this.bracketLoaded = false;
    this.bracket = null;
    if (this.view === 'groups') {
      await this.loadGroups();
    }
    if (this.view === 'bracket') {
      await this.loadBracket();
    }
    this.loading = false;
  }

  // Charge les compétitions, garantit une sélection, puis les matchs du calendrier.
  private async load() {
    // On repart toujours sur les vues par défaut (Ionic réutilise l'instance de page → sinon les segments
    // garderaient leur dernier état, avec un comportement qui diffère selon le navigateur).
    this.view = "calendar";
    this.when = "upcoming";
    this.bracketMode = "tree";
    this.loading = true;
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadMatches();
    this.loading = false;
  }

  // Récupère les matchs (selon le filtre `when`) de la compétition sélectionnée, regroupés par jour.
  private async loadMatches() {
    const matches = this.selectedCompetitionId
      ? await this.matchService.getMatches(this.selectedCompetitionId, this.when)
      : [];
    this.days = this.groupByDay(matches);
    this.currentIndex = this.when === 'past' ? Math.max(0, this.days.length - 1) : 0;
  }

  // Charge les poules de la compétition sélectionnée et sélectionne la première par défaut.
  private async loadGroups() {
    this.groups = this.selectedCompetitionId
      ? await this.groupService.getGroups(this.selectedCompetitionId)
      : [];
    this.selectedGroupId = this.groups[0]?.id ?? null;
    this.groupsLoaded = true;
  }

  // Charge le bracket (phase à élimination directe) de la compétition sélectionnée.
  private async loadBracket() {
    this.bracket = this.selectedCompetitionId
      ? await this.bracketService.getBracket(this.selectedCompetitionId)
      : null;
    this.bracketLoaded = true;
  }

  // Regroupe les matchs par jour, en ordre chronologique (jours et matchs triés croissant).
  private groupByDay(matches: Match[]): MatchDay[] {
    const byDate = new Map<string, Match[]>();
    for (const match of matches) {
      const date = match.kickoff_at.slice(0, 10);
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(match);
    }
    return [...byDate.entries()]
      .map(([date, dayMatches]) => ({
        date,
        label: dayjs(date).format("dddd D MMMM"),
        matches: [...dayMatches].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
