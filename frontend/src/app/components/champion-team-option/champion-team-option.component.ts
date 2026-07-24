import { Component, input, output } from '@angular/core';

import { ChampionTeam } from 'src/app/services/champion-bet-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

// Une option d'équipe dans le pari « vainqueur » : drapeau + nom, mis en avant si c'est le champion parié.
// Émet `pick` (id de l'équipe) au clic.
@Component({
  selector: 'app-champion-team-option',
  templateUrl: './champion-team-option.component.html',
  styleUrls: ['./champion-team-option.component.scss'],
  imports: [FlagComponent]
})
export class ChampionTeamOptionComponent {
  team = input.required<ChampionTeam>();
  selected = input<boolean>(false);

  pick = output<number>();

  onPick() {
    this.pick.emit(this.team().id);
  }
}
