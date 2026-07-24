import { Injectable, signal } from '@angular/core';

// État réseau de l'app, déduit du résultat des requêtes (MessageService) : hors-ligne = serveur injoignable
// (status 0). Le bandeau global (app.component) s'affiche quand `offline()` est vrai.
@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  // Vrai quand la dernière requête n'a pas pu joindre le serveur.
  readonly offline = signal(false);

  setOffline(value: boolean) {
    if (this.offline() !== value) {
      this.offline.set(value);
    }
  }
}
