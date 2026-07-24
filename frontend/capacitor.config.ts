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
    }
  }
};

export default config;
