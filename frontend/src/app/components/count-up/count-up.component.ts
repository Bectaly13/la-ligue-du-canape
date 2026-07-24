import { Component, effect, input, OnDestroy } from '@angular/core';

// Compteur animé : part de 0 à l'affichage et incrémente de 1 en 1 jusqu'à la valeur cible.
// La cadence (durée / cible) fait que tous les compteurs atteignent leur cible en même temps
// (ex. sur 500 ms : une cible de 10 avance toutes les 50 ms, une cible de 5 toutes les 100 ms).
@Component({
  selector: 'app-count-up',
  template: '{{ display }}'
})
export class CountUpComponent implements OnDestroy {
  value = input.required<number>();
  duration = input<number>(500);
  display = 0;

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    // Relance l'animation à chaque changement de la valeur cible (ex. changement de compétition).
    effect(() => this.animateTo(this.value(), this.duration()));
  }

  private animateTo(target: number, duration: number) {
    this.stop();
    if (target <= 0) {
      this.display = 0;
      return;
    }
    this.display = 0;
    const step = Math.max(1, duration / target);
    this.timer = setInterval(() => {
      this.display++;
      if (this.display >= target) {
        this.stop();
      }
    }, step);
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
