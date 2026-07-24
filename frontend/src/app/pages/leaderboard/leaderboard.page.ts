import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophyOutline } from 'ionicons/icons';

import { CompetitionService, Competition } from 'src/app/services/competition-service';
import { LeaderboardEntry, LeaderboardService } from 'src/app/services/leaderboard-service';
import { ThemeService } from 'src/app/services/theme-service';
import { UserService } from 'src/app/services/user-service';

import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { LeaderboardItemComponent } from 'src/app/components/leaderboard-item/leaderboard-item.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

// Classement des joueurs pour la compétition sélectionnée.
@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.page.html',
  styleUrls: ['./leaderboard.page.scss'],
  imports: [IonContent, IonHeader, CompetitionSelectorComponent, EmptyStateComponent, HeaderComponent, LeaderboardItemComponent, NavbarComponent]
})
export class LeaderboardPage implements ViewWillEnter {

  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  entries: LeaderboardEntry[] = [];
  myId = 0;
  loading = true;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private competition: CompetitionService,
    private leaderboard: LeaderboardService,
    private userService: UserService,
    private router: Router
  ) {
    addIcons({ "trophy-outline": trophyOutline });
  }

  // Charge l'utilisateur courant, les compétitions + sélection, puis le classement.
  private async load() {
    this.loading = true;
    const me = this.userService.currentUser ?? await this.userService.fetchMe();
    this.myId = me?.id ?? 0;
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadEntries();
    this.loading = false;
  }

  private async loadEntries() {
    this.entries = this.selectedCompetitionId
      ? await this.leaderboard.getLeaderboard(this.selectedCompetitionId)
      : [];
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadEntries();
  }

  // Clic sur un joueur → son profil (le mien redirige vers /profile).
  openProfile(id: number) {
    if (id === this.myId) {
      this.router.navigateByUrl("/profile");
    } else {
      this.router.navigateByUrl(`/user/${id}`);
    }
  }
}
