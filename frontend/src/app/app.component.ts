import { Component, OnInit } from '@angular/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { ChatService } from './services/chat-service';
import { VersionHandlerService } from './services/version-handler-service';

// Bloque l'application en mode portrait (cible mobile). Le .catch évite une erreur dans un
// navigateur desktop, où l'API d'orientation n'est pas disponible.
ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => { /* non supporté ici */ });

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  async ngOnInit() {
    await this.initVersion();
    // Ouvre le chat au niveau de l'app (socket persistant) et calcule l'état des messages non lus.
    this.chat.init();
  }

  constructor(
    private version: VersionHandlerService,
    private chat: ChatService
  ) { }

  // Applique au démarrage les éventuelles migrations du format de stockage local.
  private async initVersion() {
    await this.version.init();
  }
}
