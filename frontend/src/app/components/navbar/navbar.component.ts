import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, footballOutline, homeOutline, personCircleOutline, trophyOutline } from 'ionicons/icons';

import { ChatService } from 'src/app/services/chat-service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [IonIcon, RouterLink, RouterLinkActive]
})
export class NavbarComponent {
  // Barre de navigation basse : Accueil / Matchs / Classement / Chat / Profil.
  constructor(private chat: ChatService) {
    addIcons({ "home-outline": homeOutline, "football-outline": footballOutline, "trophy-outline": trophyOutline, "chatbubbles-outline": chatbubblesOutline, "person-circle-outline": personCircleOutline });
  }

  // Vrai quand des messages non lus attendent l'utilisateur → pastille sur l'onglet Chat.
  get hasUnread(): boolean {
    return this.chat.hasUnread();
  }
}
