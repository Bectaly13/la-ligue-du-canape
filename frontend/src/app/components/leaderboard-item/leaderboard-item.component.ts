import { Component, input, output } from '@angular/core';

import { LeaderboardEntry } from 'src/app/services/leaderboard-service';

import { AdminBadgeComponent } from 'src/app/components/admin-badge/admin-badge.component';
import { AvatarComponent } from 'src/app/components/avatar/avatar.component';
import { CountUpComponent } from 'src/app/components/count-up/count-up.component';

import { plural } from 'src/app/utils/plural';

// Une ligne du classement : rang (médaille top 3), avatar, pseudo (+ badge admin), détail
// bons/exacts, et points. Clic → ouverture du profil du joueur.
@Component({
  selector: 'app-leaderboard-item',
  templateUrl: './leaderboard-item.component.html',
  styleUrls: ['./leaderboard-item.component.scss'],
  imports: [AdminBadgeComponent, AvatarComponent, CountUpComponent]
})
export class LeaderboardItemComponent {
  entry = input.required<LeaderboardEntry>();
  // Est-ce ma propre ligne (surlignage) ?
  isMe = input<boolean>(false);

  // Ouverture du profil du joueur (émet son id).
  open = output<number>();

  // Accord en nombre des labels (« bon(s) », « exact(s) »).
  readonly plural = plural;

  onOpen() {
    this.open.emit(this.entry().id);
  }
}
