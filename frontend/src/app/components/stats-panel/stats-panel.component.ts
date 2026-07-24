import { Component, input, output } from '@angular/core';

import { Competition } from 'src/app/services/competition-service';
import { Stats } from 'src/app/services/stats-service';

import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { CountUpComponent } from 'src/app/components/count-up/count-up.component';

import { plural } from 'src/app/utils/plural';

// Bloc statistiques réutilisable (profil du joueur courant ET profil d'un tiers) : sélecteur de
// compétition + compteurs (pronos, bons, exacts, points, classement). Purement présentationnel.
@Component({
  selector: 'app-stats-panel',
  templateUrl: './stats-panel.component.html',
  styleUrls: ['./stats-panel.component.scss'],
  imports: [CompetitionSelectorComponent, CountUpComponent]
})
export class StatsPanelComponent {
  competitions = input.required<Competition[]>();
  selectedId = input.required<number | null>();
  stats = input.required<Stats | null>();

  selectedIdChange = output<number>();

  // Accord en nombre des libellés de compteurs (« Prono(s) », « Bon(s) », « Exact(s) », « point(s) »).
  readonly plural = plural;

  onCompetitionChange(id: number) {
    this.selectedIdChange.emit(id);
  }
}
