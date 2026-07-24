import { Component } from '@angular/core';

import { NetworkService } from 'src/app/services/network-service';

@Component({
  selector: 'app-offline-banner',
  templateUrl: './offline-banner.component.html',
  styleUrls: ['./offline-banner.component.scss'],
})
export class OfflineBannerComponent {
  // Bandeau « hors-ligne » posé en tête du contenu de chaque page : il pousse le contenu vers le bas
  // (jamais par-dessus) et disparaît dès que le serveur redevient joignable.
  constructor(private network: NetworkService) { }

  // Vrai quand la dernière requête n'a pas pu joindre le serveur.
  get offline(): boolean {
    return this.network.offline();
  }
}
