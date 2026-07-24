import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';

import { GroupStanding } from 'src/app/services/group-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import { plural } from 'src/app/utils/plural';

// Tableau de classement d'une poule (compact, mobile) : rang, équipe, joués, diff, points.
// Au clic sur une équipe, une ligne se déplie sous elle avec ses stats détaillées (V/N/D, buts).
@Component({
  selector: 'app-group-standings',
  templateUrl: './group-standings.component.html',
  styleUrls: ['./group-standings.component.scss'],
  imports: [IonIcon, FlagComponent]
})
export class GroupStandingsComponent {
  standings = input.required<GroupStanding[]>();

  // Accord en nombre des labels (« marqué(s) », « encaissé(s) »).
  readonly plural = plural;

  // Équipe dont le détail est déplié (null = tout replié).
  expandedId: number | null = null;

  toggle(teamId: number) {
    this.expandedId = this.expandedId === teamId ? null : teamId;
  }

  // Différence de buts signée pour l'affichage (« +3 », « 0 », « -2 »).
  signedDiff(value: number): string {
    return value > 0 ? `+${value}` : `${value}`;
  }
}
