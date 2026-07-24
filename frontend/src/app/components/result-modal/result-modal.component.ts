import { Component, computed, effect, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, close, remove } from 'ionicons/icons';

import { AdminMatch, AdminService } from 'src/app/services/admin-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';
import { matchLabel } from 'src/app/utils/stage';

// Modale admin (bottom sheet) de saisie du résultat d'un match : steppers de score, et — uniquement sur
// un nul en élimination directe — steppers de tirs au but (qui doivent départager). Pilotée par la page.
@Component({
  selector: 'app-result-modal',
  templateUrl: './result-modal.component.html',
  styleUrls: ['./result-modal.component.scss'],
  imports: [IonIcon, FlagComponent]
})
export class ResultModalComponent {
  open = input.required<boolean>();
  match = input.required<AdminMatch | null>();

  closed = output<void>();
  saved = output<void>();

  score1 = signal(0);
  score2 = signal(0);
  penalty1 = signal(0);
  penalty2 = signal(0);
  saving = signal(false);
  error = signal("");

  // Élimination directe : les t.a.b. n'ont de sens qu'ici.
  readonly isKnockout = computed(() => (this.match()?.stage ?? "poule") !== "poule");
  readonly legType = computed(() => this.match()?.legType ?? "single");

  // Manche retour dont l'aller n'est pas encore validé → on ne peut pas conclure (cumul inconnu).
  readonly firstLegMissing = computed(() => this.legType() === "retour" && this.match()?.firstLegGoals1 == null);

  // Cumul (aller + saisie en cours), seulement pour un retour dont l'aller est validé.
  readonly aggregate = computed<{ a: number; b: number } | null>(() => {
    const m = this.match();
    if (this.legType() !== "retour" || m?.firstLegGoals1 == null) {
      return null;
    }
    return { a: this.score1() + m.firstLegGoals1, b: this.score2() + (m.firstLegGoals2 ?? 0) };
  });

  // T.a.b. requis : aller → jamais ; retour → si cumul à égalité ; match unique → si nul.
  readonly needsPenalties = computed(() => {
    if (!this.isKnockout()) {
      return false;
    }
    const type = this.legType();
    if (type === "aller") {
      return false;
    }
    if (type === "retour") {
      const agg = this.aggregate();
      return agg ? agg.a === agg.b : false;
    }
    return this.score1() === this.score2();
  });

  // Les t.a.b. doivent départager (interdit de valider aux t.a.b. à égalité).
  readonly penaltiesInvalid = computed(() => this.needsPenalties() && this.penalty1() === this.penalty2());

  // La section t.a.b. est-elle présente ? Oui pour un match unique ou une manche retour en élim directe
  // (elle reste affichée mais GRISÉE quand les t.a.b. sont inutiles → hauteur de la feuille constante).
  // Une manche aller (jamais de t.a.b.) ou un match de poule ne l'affichent pas du tout.
  readonly showPenaltiesSection = computed(() => this.isKnockout() && this.legType() !== "aller");

  // Étiquette de manche (aller-retour) : "Aller" / "Retour" / "" (match unique ou poule).
  readonly legLabel = computed(() => {
    const type = this.legType();
    return type === "aller" ? "Aller" : type === "retour" ? "Retour" : "";
  });

  // Sous-titre : poule/tour + date et heure (heure de Paris).
  readonly subtitle = computed(() => {
    const m = this.match();
    if (!m) {
      return "";
    }
    return `${matchLabel(m.stage, m.group_label)} · ${dayjs(m.kickoff_at).format("ddd D MMM · HH:mm")}`;
  });

  constructor(
    private admin: AdminService
  ) {
    addIcons({ "add": add, "close": close, "remove": remove });
    // À l'ouverture d'un match, initialise depuis son résultat courant (ou 0-0 s'il n'est pas validé).
    effect(() => {
      const m = this.match();
      this.error.set("");
      this.score1.set(m?.score1 ?? 0);
      this.score2.set(m?.score2 ?? 0);
      this.penalty1.set(m?.penalty_score1 ?? 0);
      this.penalty2.set(m?.penalty_score2 ?? 0);
    });
  }

  inc1() { this.score1.update((v) => v + 1); }
  dec1() { this.score1.update((v) => Math.max(0, v - 1)); }
  inc2() { this.score2.update((v) => v + 1); }
  dec2() { this.score2.update((v) => Math.max(0, v - 1)); }
  incP1() { this.penalty1.update((v) => v + 1); }
  decP1() { this.penalty1.update((v) => Math.max(0, v - 1)); }
  incP2() { this.penalty2.update((v) => v + 1); }
  decP2() { this.penalty2.update((v) => Math.max(0, v - 1)); }

  onClose() {
    this.closed.emit();
  }

  async validate() {
    const m = this.match();
    if (!m || this.saving() || this.penaltiesInvalid() || this.firstLegMissing()) {
      return;
    }
    this.saving.set(true);
    this.error.set("");
    const pen1 = this.needsPenalties() ? this.penalty1() : null;
    const pen2 = this.needsPenalties() ? this.penalty2() : null;
    const response = await this.admin.setResult(m.id, this.score1(), this.score2(), pen1, pen2);
    this.saving.set(false);
    if (response.ok) {
      this.saved.emit();
    } else {
      this.error.set(response.reason ?? "Erreur");
    }
  }
}
