// Génère une VRAIE image d'avatar par défaut (initiale sur fond coloré dérivé du nom), en data URL.
// C'est une image PNG → réutilisable partout (profil, chat global…), pas juste une lettre dans un <div>.
const COLORS = [
  "#3B82F6", "#2563EB", "#0EA5E9", "#6366F1", "#8B5CF6",
  "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#14B8A6"
];

// `seed` = graine de couleur STABLE (ex. l'id du joueur) → la couleur ne change pas si le nom change.
// `name` sert uniquement à l'initiale affichée.
export function defaultAvatarDataUrl(name: string, seed: string = name, size = 256): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  // Couleur stable dérivée du seed (id), pas du nom.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  ctx.fillStyle = COLORS[Math.abs(hash) % COLORS.length];
  ctx.fillRect(0, 0, size, size);

  // Initiale centrée.
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, size / 2, size / 2 + size * 0.03);

  return canvas.toDataURL("image/png");
}
