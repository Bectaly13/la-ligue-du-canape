import { Component, effect, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, close, create } from 'ionicons/icons';

import { Member } from 'src/app/services/user-service';

import { AdminBadgeComponent } from 'src/app/components/admin-badge/admin-badge.component';
import { AvatarComponent } from 'src/app/components/avatar/avatar.component';

// Card d'identité réutilisable : avatar + pseudo + id. En mode `editable` (profil du joueur courant),
// elle porte l'édition du pseudo et le changement/retrait de photo ; sinon elle est en lecture seule.
@Component({
  selector: 'app-identity-card',
  templateUrl: './identity-card.component.html',
  styleUrls: ['./identity-card.component.scss'],
  imports: [IonIcon, FormsModule, AdminBadgeComponent, AvatarComponent]
})
export class IdentityCardComponent {
  user = input.required<Member>();
  editable = input<boolean>(false);
  // Erreur de sauvegarde du pseudo (renvoyée par le serveur), affichée sous le champ.
  nameError = input<string>("");

  // Le pseudo validé est confirmé au parent (qui persiste) ; idem photo choisie / retirée.
  nameSaved = output<string>();
  photoPicked = output<File>();
  photoRemoved = output<void>();

  editing = false;
  draft = "";
  // Masque l'erreur dès que l'utilisateur retape (évite d'afficher une erreur périmée).
  dismissedError = false;

  private lastName: string | undefined;

  constructor() {
    addIcons({ "checkmark": checkmark, "close": close, "create": create });
    // Referme l'édition quand le pseudo change (= sauvegarde réussie côté parent).
    effect(() => {
      const name = this.user().name;
      if (this.lastName !== undefined && name !== this.lastName) {
        this.editing = false;
      }
      this.lastName = name;
    });
  }

  startEdit() {
    this.draft = this.user().name;
    this.dismissedError = false;
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
  }

  save() {
    this.nameSaved.emit(this.draft);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.photoPicked.emit(file);
    }
    input.value = "";
  }

  removePhoto() {
    this.photoRemoved.emit();
  }
}
