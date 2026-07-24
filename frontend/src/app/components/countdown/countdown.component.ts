import { Component, effect, input, OnDestroy, output } from '@angular/core';

import dayjs from 'src/app/utils/dayjs';

// Compte à rebours jusqu'à une cible (ISO, heure de Paris, comme les coups d'envoi). Rafraîchi chaque
// seconde ; émet `reached` quand la cible est atteinte. Affiche jours / heures / minutes / secondes.
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss']
})
export class CountdownComponent implements OnDestroy {
  target = input.required<string>();
  reached = output<void>();

  days = 0;
  hours = 0;
  minutes = 0;
  seconds = 0;

  private timer?: ReturnType<typeof setInterval>;
  private done = false;

  constructor() {
    // (Re)démarre le décompte à chaque changement de cible (ex. changement de compétition).
    effect(() => {
      this.target();
      this.restart();
    });
  }

  // Complète à deux chiffres (heures / minutes / secondes).
  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  private restart() {
    this.stop();
    this.done = false;
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private tick() {
    const diff = dayjs(this.target()).diff(dayjs(), "second");
    if (diff <= 0) {
      this.days = this.hours = this.minutes = this.seconds = 0;
      this.stop();
      if (!this.done) {
        this.done = true;
        this.reached.emit();
      }
      return;
    }
    this.days = Math.floor(diff / 86400);
    this.hours = Math.floor((diff % 86400) / 3600);
    this.minutes = Math.floor((diff % 3600) / 60);
    this.seconds = diff % 60;
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  ngOnDestroy() {
    this.stop();
  }
}
