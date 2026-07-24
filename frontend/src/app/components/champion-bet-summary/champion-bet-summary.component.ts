import { Component, input } from '@angular/core';

import { ChampionPick } from 'src/app/services/champion-bet-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import { plural } from 'src/app/utils/plural';

// Affiche, en lecture seule, le pari « vainqueur » d'un joueur : l'équipe pariée (drapeau + nom) et,
// selon l'état, les points figés ou la récompense en jeu. Sans pari (jamais parié, pari oublié, ou pas
// encore fait, pour soi comme pour un tiers) : un unique libellé « Aucun pari de vainqueur ».
@Component({
  selector: 'app-champion-bet-summary',
  templateUrl: './champion-bet-summary.component.html',
  styleUrls: ['./champion-bet-summary.component.scss'],
  imports: [FlagComponent]
})
export class ChampionBetSummaryComponent {
  pick = input.required<ChampionPick | null>();

  // Accord en nombre (0 et ≥ 2 au pluriel).
  readonly plural = plural;
}
