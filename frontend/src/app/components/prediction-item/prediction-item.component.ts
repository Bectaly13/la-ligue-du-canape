import { Component, input, output } from '@angular/core';

import { PredMatch } from 'src/app/services/prediction-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';
import { plural } from 'src/app/utils/plural';
import { matchLabel } from 'src/app/utils/stage';

// Une card de « Mes pronos », déclinée en 3 modes :
//  - toPredict : pas de prono. Score au centre en tirets. CTA « Pronostiquer » si encore ouvert.
//  - predicted : prono posé. Score au centre = mon prono. Cote + « Modifier » / « En attente du résultat ».
//  - archived  : match validé. Score au centre = résultat RÉEL (+ t.a.b.), et mon prono confronté + points.
// L'espace du t.a.b. est toujours réservé → toutes les cards ont la même hauteur.
@Component({
  selector: 'app-prediction-item',
  templateUrl: './prediction-item.component.html',
  styleUrls: ['./prediction-item.component.scss'],
  imports: [FlagComponent]
})
export class PredictionItemComponent {
  // Accord en nombre (0 et ≥ 2 au pluriel).
  readonly plural = plural;

  kind = input.required<'toPredict' | 'predicted' | 'archived'>();
  match = input.required<PredMatch>();
  predicted1 = input<number | null>(null);
  predicted2 = input<number | null>(null);
  editable = input<boolean>(false);    // predicted
  odds = input<number | null>(null);   // predicted & archived (cote de l'issue pariée)
  correct = input<boolean | null>(null); // archived
  exact = input<boolean | null>(null);   // archived
  points = input<number | null>(null);   // archived
  mine = input<boolean>(true);           // archived : le prono est-il le mien (« Ton » vs « Son ») ?

  // Ouverture de la modale de prono (émet l'id) si le match est encore pronosticable / modifiable.
  open = output<number>();

  // Contexte : poule/tour + date + heure.
  context(): string {
    const m = this.match();
    return `${matchLabel(m.stage, m.group_label)} · ${dayjs(m.kickoff_at).format("ddd D MMM · HH:mm")}`;
  }

  // Score central : résultat réel (archivé), prono posé (predicted), ou tiret (sans prono).
  centerScore1(): string {
    return this.kind() === "archived" ? `${this.match().score1}` : this.kind() === "predicted" ? `${this.predicted1()}` : "–";
  }

  centerScore2(): string {
    return this.kind() === "archived" ? `${this.match().score2}` : this.kind() === "predicted" ? `${this.predicted2()}` : "–";
  }

  hasTab(): boolean {
    return this.kind() === "archived" && this.match().penalty_score1 !== null;
  }

  hasPrediction(): boolean {
    return this.predicted1() !== null;
  }

  clickable(): boolean {
    return this.kind() === "toPredict" || (this.kind() === "predicted" && this.editable());
  }

  onOpen() {
    if (this.clickable()) {
      this.open.emit(this.match().id);
    }
  }
}
