// Accord en nombre (règle française) : singulier pour 0 et ±1 ; pluriel à partir de ±2.
// Renvoie la forme du mot (sans le nombre) ; pluriel par défaut = singulier + "s".
// Ex. : plural(0, "point") → "point" ; plural(1, "point") → "point" ; plural(2, "point") → "points".
export function plural(count: number, singular: string, pluralForm: string = singular + "s"): string {
  return Math.abs(count) <= 1 ? singular : pluralForm;
}
