import { Component, input, output } from '@angular/core';

import { Match } from 'src/app/services/match-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

import dayjs from 'src/app/utils/dayjs';
import { matchLabel } from 'src/app/utils/stage';

@Component({
  selector: 'app-match-item',
  templateUrl: './match-item.component.html',
  styleUrls: ['./match-item.component.scss'],
  imports: [FlagComponent]
})
export class MatchItemComponent {
  // Le match à afficher.
  match = input.required<Match>();

  // Affiche la date du coup d'envoi devant l'heure (utile hors d'un en-tête de jour, ex. accueil).
  showDate = input(false);

  // Ouverture du prono (émet l'id du match) quand le match est pronosticable.
  predict = output<number>();

  // Pronosticable : deux équipes connues, pas terminé, et coup d'envoi pas encore passé.
  canPredict(): boolean {
    const m = this.match();
    return !!m.team1 && !!m.team2 && m.status !== "finished" && dayjs(m.kickoff_at).isAfter(dayjs());
  }

  // En attente du résultat : coup d'envoi passé, équipes connues, mais résultat pas encore validé.
  awaitingResult(): boolean {
    const m = this.match();
    return !!m.team1 && !!m.team2 && m.status !== "finished" && !dayjs(m.kickoff_at).isAfter(dayjs());
  }

  onPredict() {
    if (this.canPredict()) {
      this.predict.emit(this.match().id);
    }
  }

  // Heure du coup d'envoi (heure française), format 24 h.
  time(): string {
    return dayjs(this.match().kickoff_at).format("HH:mm");
  }

  // Date du coup d'envoi (format court), affichée seulement si showDate (accueil, sans en-tête de jour).
  dateLabel(): string {
    return dayjs(this.match().kickoff_at).format("ddd D MMM");
  }

  // Libellé : « Groupe A1 » en poule, sinon le nom du tour (« Quart de finale »…).
  label(): string {
    const m = this.match();
    return matchLabel(m.stage, m.group_label);
  }

  // Le match est-il terminé (score disponible) ?
  isFinished(): boolean {
    return this.match().status === "finished";
  }

  // Le match a-t-il été départagé aux tirs au but ?
  hasPenalties(): boolean {
    const m = this.match();
    return m.penalty_score1 !== null && m.penalty_score2 !== null;
  }
}
