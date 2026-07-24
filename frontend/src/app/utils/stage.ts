// Libellés d'affichage des tours (le stage est stocké en code technique).
const STAGE_LABELS: Record<string, string> = {
  poule: "Poule",
  seizieme: "16ᵉ de finale",
  huitieme: "8ᵉ de finale",
  quart: "Quart de finale",
  demie: "Demi-finale",
  petite_finale: "Petite finale",
  finale: "Finale"
};

// Nom d'un tour à partir de son code.
export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

// Libellé de contexte d'un match : « Groupe A1 » en poule, sinon le nom du tour (« Quart de finale »…).
export function matchLabel(stage: string, groupLabel: string | null): string {
  return groupLabel ? `Groupe ${groupLabel}` : stageLabel(stage);
}
