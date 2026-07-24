import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';

import { ChampionBetService, ChampionPick } from 'src/app/services/champion-bet-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { ArchivedItem, PredictionService } from 'src/app/services/prediction-service';
import { Stats, StatsService } from 'src/app/services/stats-service';
import { ThemeService } from 'src/app/services/theme-service';
import { Member, UserService } from 'src/app/services/user-service';

import { ChampionBetSummaryComponent } from 'src/app/components/champion-bet-summary/champion-bet-summary.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { IdentityCardComponent } from 'src/app/components/identity-card/identity-card.component';
import { PredictionItemComponent } from 'src/app/components/prediction-item/prediction-item.component';
import { StatsPanelComponent } from 'src/app/components/stats-panel/stats-panel.component';

// Profil d'un autre joueur, en lecture seule : identité + statistiques + pari vainqueur + pronos archivés.
@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  imports: [IonContent, IonHeader, ChampionBetSummaryComponent, EmptyStateComponent, HeaderComponent, IdentityCardComponent, PredictionItemComponent, StatsPanelComponent]
})
export class UserPage implements ViewWillEnter {

  member: Member | null = null;
  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  stats: Stats | null = null;
  championPick: ChampionPick | null = null;
  archived: ArchivedItem[] = [];
  loading = true;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private userService: UserService,
    private competition: CompetitionService,
    private statsService: StatsService,
    private prediction: PredictionService,
    private championBet: ChampionBetService,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  // Charge le membre visité, les compétitions + sélection, puis ses stats et pronos archivés.
  private async load() {
    this.loading = true;
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.member = await this.userService.getUser(id);
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadForCompetition();
    this.loading = false;
  }

  // Contenu dépendant de la compétition sélectionnée : stats + pari vainqueur + pronos archivés.
  private async loadForCompetition() {
    await this.loadStats();
    await this.loadChampionPick();
    await this.loadArchived();
  }

  private async loadStats() {
    this.stats = (this.member && this.selectedCompetitionId)
      ? await this.statsService.getStats(this.selectedCompetitionId, this.member.id)
      : null;
  }

  private async loadChampionPick() {
    this.championPick = (this.member && this.selectedCompetitionId)
      ? await this.championBet.getUserChampionBet(this.member.id, this.selectedCompetitionId)
      : null;
  }

  private async loadArchived() {
    this.archived = (this.member && this.selectedCompetitionId)
      ? await this.prediction.getUserArchived(this.member.id, this.selectedCompetitionId)
      : [];
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadForCompetition();
  }

  goBack() {
    this.location.back();
  }
}
