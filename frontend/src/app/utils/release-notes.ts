// Notes de version de l'app, la plus récente en tête. Alimente la page « Notes de version ».
// La toute première version a une liste de points vide (rien à lister par rapport à un état antérieur).
export interface ReleaseNote {
  version: string;
  points: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.1",
    points: [
      "Correction de l'accord au pluriel (par ex. « 200 points » au lieu de « 200 pointss »).",
      "Affichage de la date, en plus de l'heure, sur les matchs de la vue Groupes.",
      "Le sélecteur « À venir / Joués » ne disparaît plus au chargement de la page Matchs.",
      "Le clavier ne masque plus la zone de saisie du chat sur certains appareils Android.",
      "Meilleur positionnement du titre en haut de l'écran sur certains appareils Android.",
      "Barre de navigation Android toujours lisible (boutons blancs sur fond noir), même en thème clair."
    ]
  },
  {
    version: "1.0",
    points: []
  }
];
