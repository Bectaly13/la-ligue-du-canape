// Notes de version de l'app, la plus récente en tête. Alimente la page « Notes de version ».
// La toute première version a une liste de points vide (rien à lister par rapport à un état antérieur).
export interface ReleaseNote {
  version: string;
  points: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0",
    points: []
  }
];
