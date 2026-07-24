import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward } from 'ionicons/icons';

import { ChampionBetService, ChampionPick } from 'src/app/services/champion-bet-service';
import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { NotificationService } from 'src/app/services/notification-service';
import { Stats, StatsService } from 'src/app/services/stats-service';
import { Theme, ThemeService } from 'src/app/services/theme-service';
import { User, UserService } from 'src/app/services/user-service';
import { VersionHandlerService } from 'src/app/services/version-handler-service';

import { ChampionBetSummaryComponent } from 'src/app/components/champion-bet-summary/champion-bet-summary.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { IdentityCardComponent } from 'src/app/components/identity-card/identity-card.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';
import { StatsPanelComponent } from 'src/app/components/stats-panel/stats-panel.component';

import { resizeImageToDataUrl } from 'src/app/utils/resize-image';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonContent, IonHeader, IonIcon, ChampionBetSummaryComponent, HeaderComponent, IdentityCardComponent, NavbarComponent, StatsPanelComponent]
})
export class ProfilePage implements ViewWillEnter {

  user: User | null = null;
  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  stats: Stats | null = null;
  championPick: ChampionPick | null = null;
  loading = true;

  // Erreur de sauvegarde du pseudo, transmise à la card d'identité.
  nameError = "";

  // Paramètres.
  themes: Theme[] = [];
  currentTheme: Theme = "Défaut";
  notifGlobal = true;
  notifReminders = true;
  notifScores = true;
  notifAnnouncements = true;
  version = "";
  notifsSupported = false;
  permissionGranted = true;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private userService: UserService,
    private competition: CompetitionService,
    private statsService: StatsService,
    private championBet: ChampionBetService,
    private notif: NotificationService,
    private versionHandler: VersionHandlerService,
    private router: Router
  ) {
    addIcons({ "chevron-forward": chevronForward });
  }

  // Charge profil, préférences, thème/version, compétitions et stats.
  private async load() {
    this.loading = true;
    // Vague 1 : les appels indépendants partent en parallèle (profil, compétitions, permission, thème)
    // plutôt qu'en série — on n'attend qu'une fois le plus lent des quatre.
    const [user, , permission, theme] = await Promise.all([
      this.userService.fetchMe(),
      this.loadCompetitionsAndSelect(),
      this.notif.checkPermission(),
      this.theme.getTheme()
    ]);
    this.user = user;
    if (this.user) {
      this.notifGlobal = !!this.user.notif_enabled;
      this.notifReminders = !!this.user.reminder_notif_enabled;
      this.notifScores = !!this.user.score_notif_enabled;
      this.notifAnnouncements = !!this.user.announcement_notif_enabled;
    }
    this.notifsSupported = this.notif.isNative();
    this.permissionGranted = permission;
    this.themes = this.theme.getThemes();
    this.currentTheme = theme;
    this.version = this.versionHandler.appVersionDisplay;
    await this.loadForCompetition();
    this.loading = false;
  }

  // Charge les compétitions puis établit la sélection courante (chaîne indépendante du reste).
  private async loadCompetitionsAndSelect() {
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
  }

  // Contenu dépendant de la compétition sélectionnée : stats + pari vainqueur, en parallèle.
  private async loadForCompetition() {
    await Promise.all([this.loadStats(), this.loadChampionPick()]);
  }

  private async loadStats() {
    this.stats = this.selectedCompetitionId
      ? await this.statsService.getStats(this.selectedCompetitionId)
      : null;
  }

  private async loadChampionPick() {
    this.championPick = (this.user && this.selectedCompetitionId)
      ? await this.championBet.getUserChampionBet(this.user.id, this.selectedCompetitionId)
      : null;
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadForCompetition();
  }

  // --- Édition du pseudo (pilotée par app-identity-card) ---
  // En cas de succès, le pseudo du `user` change → la card referme son mode édition d'elle-même.
  async saveName(name: string) {
    this.nameError = "";
    const response = await this.userService.updateName(name);
    if (response.ok) {
      this.user = this.userService.currentUser;
    } else {
      this.nameError = response.reason ?? "Erreur";
    }
  }

  // --- Photo de profil ---
  async onPhotoPicked(file: File) {
    const dataUrl = await resizeImageToDataUrl(file, 256);
    const response = await this.userService.updatePhoto(dataUrl);
    if (response.ok) {
      this.user = this.userService.currentUser;
    }
  }

  async removePhoto() {
    const response = await this.userService.updatePhoto(null);
    if (response.ok) {
      this.user = this.userService.currentUser;
    }
  }

  // --- Thème ---
  async selectTheme(theme: Theme) {
    await this.theme.applyTheme(theme);
    this.currentTheme = theme;
  }

  // --- Notifications (un rappel/score ne part que si le global est actif) ---
  // Vrai si le système autorise les notifications (toujours vrai hors natif).
  get systemAllowed(): boolean {
    return !this.notifsSupported || this.permissionGranted;
  }

  async toggleGlobal() {
    // Sur natif, si la permission n'est pas accordée : on la demande, sinon on ouvre les réglages système.
    if (this.notifsSupported && !this.permissionGranted) {
      this.permissionGranted = await this.notif.requestPermission();
      if (!this.permissionGranted) {
        await this.notif.openSettings();
        return;
      }
    }
    this.notifGlobal = !this.notifGlobal;
    await this.saveNotifs();
    if (this.notifGlobal && this.notifsSupported && this.permissionGranted) {
      await this.notif.registerForPush();
    }
  }

  async openNotifSettings() {
    await this.notif.openSettings();
  }

  async toggleReminders() {
    if (!this.notifGlobal) {
      return;
    }
    this.notifReminders = !this.notifReminders;
    await this.saveNotifs();
  }

  async toggleScores() {
    if (!this.notifGlobal) {
      return;
    }
    this.notifScores = !this.notifScores;
    await this.saveNotifs();
  }

  async toggleAnnouncements() {
    if (!this.notifGlobal) {
      return;
    }
    this.notifAnnouncements = !this.notifAnnouncements;
    await this.saveNotifs();
  }

  private async saveNotifs() {
    await this.notif.savePrefs(this.notifGlobal, this.notifReminders, this.notifScores, this.notifAnnouncements);
    // Les prefs viennent de changer → (re)planifie ou annule les rappels locaux en conséquence.
    await this.notif.refreshReminders();
  }

  // --- À propos ---
  goToVersions() {
    this.router.navigateByUrl("/versions");
  }
}
