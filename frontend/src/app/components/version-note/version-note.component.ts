import { Component, input } from '@angular/core';

import { ReleaseNote } from 'src/app/utils/release-notes';

@Component({
  selector: 'app-version-note',
  templateUrl: './version-note.component.html',
  styleUrls: ['./version-note.component.scss'],
})
export class VersionNoteComponent {
  // Une note de version (numéro + points). L'animation d'entrée est portée par l'hôte ; la page
  // décale chaque note (animation-delay) pour l'effet « vague ».
  note = input.required<ReleaseNote>();
}
