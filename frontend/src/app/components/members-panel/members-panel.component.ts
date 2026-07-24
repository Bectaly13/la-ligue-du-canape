import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

import { Member } from 'src/app/services/user-service';

import { AdminBadgeComponent } from 'src/app/components/admin-badge/admin-badge.component';
import { AvatarComponent } from 'src/app/components/avatar/avatar.component';

// Panneau latéral listant les membres. Piloté par l'état `open` de la page hôte.
// Émet `selected` (id du membre choisi) et `closed`.
@Component({
  selector: 'app-members-panel',
  templateUrl: './members-panel.component.html',
  styleUrls: ['./members-panel.component.scss'],
  imports: [IonIcon, AdminBadgeComponent, AvatarComponent]
})
export class MembersPanelComponent {
  open = input.required<boolean>();
  members = input.required<Member[]>();
  myId = input.required<number>();

  selected = output<number>();
  closed = output<void>();

  constructor() {
    addIcons({ "close": close });
  }

  onSelect(id: number) {
    this.selected.emit(id);
  }

  onClose() {
    this.closed.emit();
  }
}
