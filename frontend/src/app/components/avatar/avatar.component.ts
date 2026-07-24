import { Component, computed, input } from '@angular/core';

import { defaultAvatarDataUrl } from 'src/app/utils/default-avatar';

// Avatar réutilisable : affiche une VRAIE image (la photo du joueur, ou une image par défaut générée
// à partir de son nom). Remplit son conteneur (qui gère la taille et le clip circulaire).
@Component({
  selector: 'app-avatar',
  template: '<img class="avatar-img" [src]="src()" alt="Avatar" />',
  styles: [':host { display: block; } .avatar-img { display: block; width: 100%; height: 100%; object-fit: cover; }']
})
export class AvatarComponent {
  photo = input<string | null>(null);
  name = input.required<string>();
  seed = input<string | number | null>(null); // graine de couleur stable (ex. id) ; défaut = le nom

  src = computed(() => this.photo() || defaultAvatarDataUrl(this.name(), String(this.seed() ?? this.name())));
}
