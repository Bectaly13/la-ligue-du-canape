import { Component, computed, input, signal } from '@angular/core';

// Drapeau d'une équipe, réutilisable. L'image remplit son hôte ; la TAILLE et le CADRE (bordure,
// arrondi) viennent de la classe appliquée par le parent (ex. .match-item-flag). Si le slug est
// absent ou l'image introuvable, l'hôte reste vide → le cadre du parent sert de placeholder.
// Fichier attendu : assets/flags/<slug>.png (voir docs/modele-de-donnees.md pour le versionnage « _2 »).
@Component({
  selector: 'app-flag',
  template: `@if (showImage()) {
    <img class="flag-img" [src]="src()" [alt]="name()" (error)="onError()" />
  }`,
  styles: [`
    :host { display: inline-block; overflow: hidden; }
    .flag-img { display: block; width: 100%; height: 100%; object-fit: cover; }
  `]
})
export class FlagComponent {
  slug = input<string | null>(null);
  name = input<string>("");

  private errored = signal(false);

  src = computed(() => `assets/flags/${this.slug()}.png`);
  showImage = computed(() => !!this.slug() && !this.errored());

  onError() {
    this.errored.set(true);
  }
}
