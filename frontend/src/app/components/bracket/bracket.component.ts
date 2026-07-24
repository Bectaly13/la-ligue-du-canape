import { Component, computed, input, output } from '@angular/core';

import { BracketMatch, BracketRound } from 'src/app/services/bracket-service';

import { BracketMatchComponent } from 'src/app/components/bracket-match/bracket-match.component';

// Arbre du bracket : une colonne par tour (quarts → demies → finale), reliées par des connecteurs
// qui matérialisent les croisements. Défilable horizontalement. La petite finale est affichée à part.
@Component({
  selector: 'app-bracket',
  templateUrl: './bracket.component.html',
  styleUrls: ['./bracket.component.scss'],
  imports: [BracketMatchComponent]
})
export class BracketComponent {
  rounds = input.required<BracketRound[]>();
  thirdPlace = input.required<BracketMatch | null>();

  // Tours enrichis des drapeaux de connecteurs. Une transition « tirée au sort » (le tour aval a
  // `drawnEntry`) ne se relie pas : on masque le trait sortant du tour amont ET le trait entrant du tour aval.
  readonly displayRounds = computed(() => {
    const rounds = this.rounds();
    return rounds.map((round, index) => ({
      round,
      hideIncoming: index > 0 && round.drawnEntry,
      hideOutgoing: index < rounds.length - 1 && rounds[index + 1].drawnEntry
    }));
  });

  // Relaie l'ouverture du prono d'un match (depuis une card) vers la page.
  predict = output<number>();
}
