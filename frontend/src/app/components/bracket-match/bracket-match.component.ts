import { Component, input, output } from '@angular/core';

import { BracketMatch } from 'src/app/services/bracket-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';

// Une carte de CONFRONTATION du bracket : deux slots (équipe + drapeau, ou libellé de provenance), avec —
// si joué — le cumul (gros) + le détail des manches (aller·retour), et la mise en évidence du vainqueur.
@Component({
  selector: 'app-bracket-match',
  templateUrl: './bracket-match.component.html',
  styleUrls: ['./bracket-match.component.scss'],
  imports: [FlagComponent]
})
export class BracketMatchComponent {
  match = input.required<BracketMatch>();

  // Ouverture du prono (émet l'id du match) — uniquement pour un match UNIQUE pronosticable.
  predict = output<number>();

  // Au moins une manche jouée → un cumul est disponible.
  hasScore(): boolean {
    return this.match().agg1 !== null;
  }

  // Pronosticable depuis le bracket : match UNIQUE, deux équipes connues, non terminé, coup d'envoi à venir.
  // (Les confrontations aller-retour se pronostiquent manche par manche depuis le calendrier.)
  canPredict(): boolean {
    const m = this.match();
    return !m.twoLegged && !!m.slot1.team && !!m.slot2.team && m.status !== "finished" && dayjs(m.kickoff_at).isAfter(dayjs());
  }

  onPredict() {
    if (this.canPredict()) {
      this.predict.emit(this.match().id);
    }
  }

  // Confrontation tranchée aux tirs au but (le petit chiffre entre parenthèses).
  hasPenalties(): boolean {
    return this.match().pen1 !== null;
  }
}
