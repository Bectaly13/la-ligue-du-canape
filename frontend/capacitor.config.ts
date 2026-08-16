import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.bectaly.mpp',
  appName: 'La Ligue du Canapé',
  webDir: 'www',

  plugins: {
    // Badge des notifications LOCALES (rappels avant-match) : petite icône monochrome + couleur d'accent.
    LocalNotifications: {
      smallIcon: "res://drawable/football",
      iconColor: "#105EF6"
    },

    // Clavier : on désactive le resize du plugin (resizeOnFullScreen ne se déclenche pas sur Android < 10,
    // faute d'inset IME fiable). Le redimensionnement de la WebView à l'ouverture du clavier est géré
    // nous-mêmes, pour toutes les versions, dans MainActivity.enableKeyboardResize (réplique de adjustResize).
    Keyboard: {
      resizeOnFullScreen: false
    }
  }
};

export default config;
