import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline } from 'ionicons/icons';

import { AdminBracket, AdminBracketSlot, AdminService } from 'src/app/services/admin-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { ThemeService } from 'src/app/services/theme-service';

import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

import dayjs from 'src/app/utils/dayjs';

// Outil admin : placement manuel des équipes dans les cases du bracket (hybride avec l'auto-fill).
// Route /admin/bracket.
@Component({
  selector: 'app-admin-bracket',
  templateUrl: './admin-bracket.page.html',
  styleUrls: ['./admin-bracket.page.scss'],
  imports: [IonContent, IonHeader, CompetitionSelectorComponent, EmptyStateComponent, HeaderComponent]
})
export class AdminBracketPage implements ViewWillEnter {

  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  bracket: AdminBracket | null = null;
  // Confrontations effectivement modifiables (les déjà validées sont verrouillées → on ne les affiche pas).
  editableTies: AdminBracket["ties"] = [];
  error = "";

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

  goBack() {
    this.router.navigateByUrl("/admin");
  }

  goHome() {
    this.router.navigateByUrl("/home");
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadBracket();
  }

  // Date/heure d'un coup d'envoi (heure de Paris), format court.
  when(kickoff: string): string {
    return dayjs(kickoff).format("ddd D MMM · HH:mm");
  }

  // Place l'équipe choisie (valeur du <select>) dans le slot, puis recharge (reflète la synchro aller-retour).
  async place(slot: AdminBracketSlot, value: string) {
    const teamId = Number(value);
    if (!teamId) {
      return;
    }
    this.error = "";
    const response = await this.admin.setSlot(slot.matchId, slot.side, teamId);
    if (!response.ok) {
      this.error = response.reason || "Placement impossible.";
    }
    await this.loadBracket();
  }

  private async load() {
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadBracket();
  }

  private async loadBracket() {
    this.bracket = this.selectedCompetitionId
      ? await this.admin.getBracket(this.selectedCompetitionId)
      : null;
    this.editableTies = this.bracket?.ties.filter((tie) => tie.editable) ?? [];
  }
}
