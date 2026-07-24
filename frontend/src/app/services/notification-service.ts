import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings';
import dayjs, { parisWall } from 'src/app/utils/dayjs';

import { CompetitionService } from './competition-service';
import { MatchService } from './match-service';
import { UserService } from './user-service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Gère la permission système et l'enregistrement push. Les préférences (les 3 booléens) vivent sur
  // l'utilisateur (côté serveur) ; la mécanique d'envoi réel (rappels locaux + push FCM) est native.

  constructor(
    private user: UserService,
    private competition: CompetitionService,
    private match: MatchService
  ) { }

  // Vrai sur plateforme native (les notifications n'existent pas sur le web).
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Statut de la permission, sans dialogue. « Accordé » hors natif (rien à demander sur le web).
  async checkPermission(): Promise<boolean> {
    if (!this.isNative()) {
      return true;
    }
    const result = await LocalNotifications.checkPermissions();
    return result.display === "granted";
  }

  // Demande la permission (dialogue système), côté notifications locales ET push.
  async requestPermission(): Promise<boolean> {
    if (!this.isNative()) {
      return true;
    }
    const local = await LocalNotifications.requestPermissions();
    const push = await PushNotifications.requestPermissions();
    return local.display === "granted" || push.receive === "granted";
  }

  // Ouvre l'écran de réglages des notifications de l'app (pour réautoriser après un refus).
  async openSettings(): Promise<void> {
    if (!this.isNative()) {
      return;
    }
    await NativeSettings.open({
      optionAndroid: AndroidSettings.AppNotification,
      optionIOS: IOSSettings.App
    });
  }

  // Enregistre les préférences (côté serveur, sur l'utilisateur).
  async savePrefs(global: boolean, reminders: boolean, scores: boolean, announcements: boolean) {
    return this.user.updateNotifPrefs(global, reminders, scores, announcements);
  }

  // Enregistrement push (FCM) : s'abonne à l'événement d'enregistrement (récupération du token) puis
  // s'enregistre, et stocke le token côté serveur. Nécessite une config Firebase (google-services.json)
  // → réellement opérationnel au build natif. Sans effet hors natif.
  async registerForPush(): Promise<void> {
    if (!this.isNative()) {
      return;
    }
    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", async (token) => {
      await this.user.updateFcmToken(token.value);
    });
    await PushNotifications.register();
  }

  // (Re)planifie les rappels locaux : 1 h et 15 min avant chaque match À VENIR de la compétition
  // sélectionnée (aux deux équipes connues). Idempotent : on annule l'existant puis on reprogramme depuis
  // zéro → survit app fermée (planifié par l'OS) et se met à jour à chaque appel. Appelé à l'ouverture de
  // l'app et après un changement de préférences.
  async refreshReminders(): Promise<void> {
    if (!this.isNative() || !(await this.checkPermission())) {
      return;
    }

    // On annule TOUJOURS l'existant d'abord (évite les doublons ; purge si l'utilisateur a coupé).
    await this.cancelAllPending();

    // Un rappel ne part que si le global ET les rappels sont actifs.
    const me = this.user.currentUser;
    if (!me?.notif_enabled || !me?.reminder_notif_enabled) {
      return;
    }

    const competitionId = await this.competition.getSelectedId();
    if (competitionId === null) {
      return;
    }

    const matches = await this.match.getMatches(competitionId, "upcoming");
    const now = dayjs();
    const toSchedule: LocalNotificationSchema[] = [];
    for (const m of matches) {
      // Adversaires pas encore connus (élim directe) → aucun rappel utile.
      if (!m.team1 || !m.team2) {
        continue;
      }
      const kickoff = parisWall(m.kickoff_at);
      const label = `${m.team1.name} – ${m.team2.name}`;
      // Ids déterministes par match (rescheduling idempotent) : ×10 + 1 (1 h) / + 2 (15 min).
      const oneHour = kickoff.subtract(1, "hour");
      const quarter = kickoff.subtract(15, "minute");
      if (oneHour.isAfter(now)) {
        toSchedule.push({ id: m.id * 10 + 1, title: "Rappel de match", body: `${label} commence dans 1 heure !`, schedule: { at: oneHour.toDate() } });
      }
      if (quarter.isAfter(now)) {
        toSchedule.push({ id: m.id * 10 + 2, title: "Rappel de match", body: `${label} commence dans 15 minutes !`, schedule: { at: quarter.toDate() } });
      }
    }

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  }

  // Annule tous les rappels locaux en attente (les seules notifications locales de l'app sont ces rappels).
  private async cancelAllPending(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  }
}
