import { Component, computed, ElementRef, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, chevronDown } from 'ionicons/icons';

import { Competition } from 'src/app/services/competition-service';

@Component({
  selector: 'app-competition-selector',
  templateUrl: './competition-selector.component.html',
  styleUrls: ['./competition-selector.component.scss'],
  imports: [IonIcon],
  // Ouvert → on remonte le z-index du host pour que le panneau flotte au-dessus du contenu
  // (les cartes des pages ont un transform d'apparition qui, sinon, se peint par-dessus).
  // Un clic n'importe où dans le document referme, sauf s'il vise le sélecteur lui-même.
  host: {
    "[class.competition-selector-open]": "isOpen()",
    "(document:click)": "onDocumentClick($event)"
  }
})
export class CompetitionSelectorComponent {
  // Liste des compétitions et id sélectionné ; émet le nouvel id au changement.
  competitions = input.required<Competition[]>();
  selectedId = input.required<number | null>();
  selectedIdChange = output<number>();

  // Ouverture du panneau custom (dropdown maison, pas le sélecteur natif Android).
  isOpen = signal(false);

  // Nom de la compétition sélectionnée (affiché dans la barre repliée).
  selectedName = computed(() => {
    const current = this.competitions().find((comp) => comp.id === this.selectedId());
    return current ? current.name : "";
  });

  constructor(
    private host: ElementRef<HTMLElement>
  ) {
    addIcons({ "chevron-down": chevronDown, "checkmark": checkmark });
  }

  // Ouvre / referme le panneau.
  toggle() {
    this.isOpen.update((open) => !open);
  }

  // Referme le panneau.
  close() {
    this.isOpen.set(false);
  }

  // Sélectionne une compétition puis referme.
  select(id: number) {
    this.selectedIdChange.emit(id);
    this.close();
  }

  // Referme si un clic tombe hors du sélecteur (le clic qui ouvre vise le bouton → dans le host).
  onDocumentClick(event: Event) {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
