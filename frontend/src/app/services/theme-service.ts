import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { StorageService } from './storage-service';

export type Theme = "Défaut" | "Clair" | "Sombre";

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Thème appliqué tant que l'utilisateur n'en a pas choisi un.
  private defaultTheme: Theme = "Défaut";

  // Correspondance thème → classe CSS appliquée sur <body> (voir src/theme/variables.scss).
  private themeClasses: Record<Theme, string> = {
    "Défaut": "theme-default",
    "Clair": "theme-light",
    "Sombre": "theme-dark"
  };

  // Style des icônes de la barre d'état Android par thème. Nommage Capacitor contre-intuitif :
  // Style.Light = icônes SOMBRES (sur fond clair), Style.Dark = icônes CLAIRES (sur fond sombre).
  private statusBarStyles: Record<Theme, Style> = {
    "Défaut": Style.Light,
    "Clair": Style.Light,
    "Sombre": Style.Dark
  };

  constructor(
    private storage: StorageService
  ) { }

  // Applique le thème mémorisé (ou le thème par défaut). À appeler au démarrage de chaque page.
  // hasHeader : la page porte-t-elle un app-header ? Si oui, la barre d'état prend la couleur du
  // header (continuité visuelle) ; sinon (onboarding) la couleur du fond de page. Défaut : true,
  // car quasi toutes les pages ont un header — seule l'onboarding passe false.
  async initTheme(hasHeader: boolean = true): Promise<void> {
    await this.applyTheme(await this.getTheme(), hasHeader);
  }

  // Applique un thème (classe sur <body>) et le mémorise.
  async applyTheme(theme: Theme, hasHeader: boolean = true): Promise<void> {
    await this.storage.set("theme", theme);
    document.body.classList.remove(...Object.values(this.themeClasses));
    document.body.classList.add(this.themeClasses[theme]);
    await this.applyStatusBar(theme, hasHeader);
  }

  // Accorde la barre d'état (Android) au thème : style des icônes + couleur de fond. La couleur est
  // celle du header (--header-background) sur les pages à header, sinon celle du fond de page
  // (--app-status-bar). Sans effet hors natif ; toute erreur est ignorée.
  private async applyStatusBar(theme: Theme, hasHeader: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await StatusBar.setStyle({ style: this.statusBarStyles[theme] });
      // setBackgroundColor n'existe que sur Android.
      if (Capacitor.getPlatform() === "android") {
        const variable = hasHeader ? "--header-background" : "--app-status-bar";
        const color = getComputedStyle(document.body).getPropertyValue(variable).trim();
        if (color) {
          await StatusBar.setBackgroundColor({ color: color });
        }
      }
    } catch {
      // Barre d'état non disponible : on ignore.
    }
  }

  // Renvoie le thème mémorisé, ou le thème par défaut.
  async getTheme(): Promise<Theme> {
    return (await this.storage.get("theme")) || this.defaultTheme;
  }

  // Liste des thèmes disponibles (pour un futur sélecteur en Paramètres).
  getThemes(): Theme[] {
    return Object.keys(this.themeClasses) as Theme[];
  }
}
