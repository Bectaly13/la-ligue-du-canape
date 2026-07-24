// Accord en nombre (convention app / « à l'anglaise ») : singulier uniquement pour ±1 ;
// 0 et ≥ 2 prennent le pluriel. Renvoie la forme du mot (sans le nombre) ; pluriel par défaut = singulier + "s".
// Ex. : plural(0, "point") → "points" ; plural(1, "point") → "point" ; plural(2, "point") → "points".
export function plural(count: number, singular: string, pluralForm: string = singular + "s"): string {
  return Math.abs(count) === 1 ? singular : pluralForm;
}
