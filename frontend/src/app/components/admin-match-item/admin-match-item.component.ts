import { Component, input, output } from '@angular/core';

import { AdminMatch } from 'src/app/services/admin-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';
import { matchLabel } from 'src/app/utils/stage';

// Une ligne de l'outil admin « saisie des résultats » : contexte, équipes, score courant (si validé),
// t.a.b. réservé, et une action (« Saisir le résultat » ou « Modifier »). Clic → ouverture de la modale.
@Component({
  selector: 'app-admin-match-item',
  templateUrl: './admin-match-item.component.html',
  styleUrls: ['./admin-match-item.component.scss'],
  imports: [FlagComponent]
})
export class AdminMatchItemComponent {
  match = input.required<AdminMatch>();
  edit = output<void>();

  isFinished(): boolean {
    return this.match().status === "finished";
  }

  hasTab(): boolean {
    const m = this.match();
    return m.penalty_score1 !== null && m.penalty_score2 !== null;
  }

  // Contexte : poule/tour · date · heure (heure de Paris).
  context(): string {
    const m = this.match();
    return `${matchLabel(m.stage, m.group_label)} · ${dayjs(m.kickoff_at).format("ddd D MMM · HH:mm")}`;
  }

  centerScore1(): string {
    return this.isFinished() ? `${this.match().score1}` : "–";
  }

  centerScore2(): string {
    return this.isFinished() ? `${this.match().score2}` : "–";
  }

  onEdit() {
    this.edit.emit();
  }
}
