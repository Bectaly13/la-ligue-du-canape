import { Injectable } from '@angular/core';

import { StorageService } from './storage-service';

@Injectable({
  providedIn: 'root',
})
export class VersionHandlerService {
  // Gère les montées de version du format de stockage LOCAL : pose la version au premier lancement,
  // puis applique séquentiellement les migrations nécessaires si le format évolue.
  // Note : le stockage local reste simple ici (auth_token, user, thème…) — la vraie base de données
  // vit côté serveur. Les migrations sont donc un échafaudage pour de futurs besoins.

  // Version du format de stockage local (entier) : à incrémenter à chaque changement de format, en
  // ajoutant la migration updateToVx() correspondante. Indépendante de la version affichée.
  private readonly appVersion: number = 1;

  // Version commerciale, destinée à l'utilisateur. Sans rapport avec appVersion. Doit toujours
  // correspondre au versionName de frontend/android/app/build.gradle.
  readonly appVersionDisplay: string = "1.0.2";

  constructor(
    private storage: StorageService
  ) { }

  // À appeler une seule fois au démarrage de l'application.
  async init(): Promise<void> {
    const userVersion: number = await this.storage.get("version");

    // Premier lancement (ou utilisateur antérieur au versionnage) : on pose la version courante.
    if (!userVersion) {
      await this.storage.set("version", this.appVersion);
      return;
    }

    // Déjà à jour : rien à faire.
    if (userVersion === this.appVersion) {
      return;
    }

    // Sinon, appliquer les migrations dans l'ordre croissant, puis enregistrer la nouvelle version.
    // if (userVersion < 2) {
    //   await this.updateToV2();
    // }
    // await this.storage.set("version", this.appVersion);
  }

  // Migration v1 → v2 : <explication de la migration>.
  // private async updateToV2(): Promise<void> {
  //   // ... transformations du format de stockage local ...
  //   // await this.storage.set("version", this.appVersion);
  // }
}
