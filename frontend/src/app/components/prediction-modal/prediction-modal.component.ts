import { Component, computed, effect, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, close, remove } from 'ionicons/icons';

import { PredictionContext, PredictionService } from 'src/app/services/prediction-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';
import { OutcomeCounts, computeOdds, outcomeOf } from 'src/app/utils/odds';
import { matchLabel } from 'src/app/utils/stage';

// Modale de prono (bottom sheet) : équipes + drapeaux, steppers de score, et les 3 cotes recalculées
// en direct (issue courante mise en avant). Pilotée par la page via `open` + `context`.
@Component({
  selector: 'app-prediction-modal',
  templateUrl: './prediction-modal.component.html',
  styleUrls: ['./prediction-modal.component.scss'],
  imports: [IonIcon, FlagComponent]
})
export class PredictionModalComponent {
  open = input.required<boolean>();
  context = input.required<PredictionContext | null>();

  closed = output<void>();
  saved = output<void>();

  score1 = signal(0);
  score2 = signal(0);
  saving = signal(false);
  error = signal("");

  // Issue pariée d'après le score saisi.
  readonly myOutcome = computed(() => outcomeOf(this.score1(), this.score2()));

  // Cotes des 3 issues, MON prono inclus (aperçu de ce que je toucherais).
  readonly odds = computed<OutcomeCounts>(() => {
    const ctx = this.context();
    if (!ctx) {
      return { team1: 100, draw: 100, team2: 100 };
    }
    const counts: OutcomeCounts = { ...ctx.counts };
    counts[this.myOutcome()] += 1;
    return computeOdds(counts);
  });

  // Sous-titre : poule/tour + date et heure (heure de Paris, déjà stockée telle quelle).
  readonly subtitle = computed(() => {
    const ctx = this.context();
    if (!ctx) {
      return "";
    }
    const label = matchLabel(ctx.match.stage, ctx.match.group_label);
    return `${label} · ${dayjs(ctx.match.kickoff_at).format("ddd D MMM · HH:mm")}`;
  });

  constructor(
    private prediction: PredictionService
  ) {
    addIcons({ "add": add, "close": close, "remove": remove });
    // À l'ouverture d'un match, initialise les scores depuis le prono existant (ou 0-0).
    effect(() => {
      const ctx = this.context();
      this.error.set("");
      this.score1.set(ctx?.myPrediction?.predicted_score1 ?? 0);
      this.score2.set(ctx?.myPrediction?.predicted_score2 ?? 0);
    });
  }

  inc1() { this.score1.update((v) => v + 1); }
  dec1() { this.score1.update((v) => Math.max(0, v - 1)); }
  inc2() { this.score2.update((v) => v + 1); }
  dec2() { this.score2.update((v) => Math.max(0, v - 1)); }

  onClose() {
    this.closed.emit();
  }

  async validate() {
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    this.saving.set(true);
    this.error.set("");
    const response = await this.prediction.setPrediction(ctx.match.id, this.score1(), this.score2());
    this.saving.set(false);
    if (response.ok) {
      this.saved.emit();
    } else {
      this.error.set(response.reason ?? "Erreur");
    }
  }
}
