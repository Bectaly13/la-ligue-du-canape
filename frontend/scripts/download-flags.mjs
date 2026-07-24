// Génère src/assets/flags/<slug>.png pour TOUTES les sélections nationales de football (membres FIFA
// + sélections non-FIFA courantes). But : embarquer tous les drapeaux une bonne fois, pour ne pas
// avoir à republier un APK le jour où un pays jamais rencontré participe à une compétition.
//
// Source : flagcdn.com (mêmes PNG w320 que les drapeaux déjà présents). Slug dérivé du nom FRANÇAIS
// selon la convention du projet (minuscules, sans diacritique ni caractère non alphanumérique) — le
// même que celui à saisir dans un seed backend (cf. seed/seedLdn2027.js).
//
// Lancement : node scripts/download-flags.mjs   (depuis frontend/)
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Nom français → code drapeau flagcdn (ISO 3166-1 alpha-2, ou sous-code gb-xxx pour les nations
// britanniques). Regroupé par confédération pour la relecture.
const COUNTRIES = [
  // --- UEFA ---
  { fr: "Albanie", iso: "al" }, { fr: "Allemagne", iso: "de" }, { fr: "Andorre", iso: "ad" },
  { fr: "Angleterre", iso: "gb-eng" }, { fr: "Arménie", iso: "am" }, { fr: "Autriche", iso: "at" },
  { fr: "Azerbaïdjan", iso: "az" }, { fr: "Belgique", iso: "be" }, { fr: "Biélorussie", iso: "by" },
  { fr: "Bosnie-Herzégovine", iso: "ba" }, { fr: "Bulgarie", iso: "bg" }, { fr: "Chypre", iso: "cy" },
  { fr: "Croatie", iso: "hr" }, { fr: "Danemark", iso: "dk" }, { fr: "Écosse", iso: "gb-sct" },
  { fr: "Espagne", iso: "es" }, { fr: "Estonie", iso: "ee" }, { fr: "Finlande", iso: "fi" },
  { fr: "France", iso: "fr" }, { fr: "Géorgie", iso: "ge" }, { fr: "Gibraltar", iso: "gi" },
  { fr: "Grèce", iso: "gr" }, { fr: "Hongrie", iso: "hu" }, { fr: "Irlande", iso: "ie" },
  { fr: "Irlande du Nord", iso: "gb-nir" }, { fr: "Islande", iso: "is" }, { fr: "Israël", iso: "il" },
  { fr: "Italie", iso: "it" }, { fr: "Kazakhstan", iso: "kz" }, { fr: "Kosovo", iso: "xk" },
  { fr: "Lettonie", iso: "lv" }, { fr: "Liechtenstein", iso: "li" }, { fr: "Lituanie", iso: "lt" },
  { fr: "Luxembourg", iso: "lu" }, { fr: "Macédoine du Nord", iso: "mk" }, { fr: "Malte", iso: "mt" },
  { fr: "Moldavie", iso: "md" }, { fr: "Monténégro", iso: "me" }, { fr: "Norvège", iso: "no" },
  { fr: "Pays-Bas", iso: "nl" }, { fr: "Pays de Galles", iso: "gb-wls" }, { fr: "Pologne", iso: "pl" },
  { fr: "Portugal", iso: "pt" }, { fr: "Roumanie", iso: "ro" }, { fr: "Russie", iso: "ru" },
  { fr: "Saint-Marin", iso: "sm" }, { fr: "Serbie", iso: "rs" }, { fr: "Slovaquie", iso: "sk" },
  { fr: "Slovénie", iso: "si" }, { fr: "Suède", iso: "se" }, { fr: "Suisse", iso: "ch" },
  { fr: "Tchéquie", iso: "cz" }, { fr: "Turquie", iso: "tr" }, { fr: "Ukraine", iso: "ua" },

  // --- CONMEBOL ---
  { fr: "Argentine", iso: "ar" }, { fr: "Bolivie", iso: "bo" }, { fr: "Brésil", iso: "br" },
  { fr: "Chili", iso: "cl" }, { fr: "Colombie", iso: "co" }, { fr: "Équateur", iso: "ec" },
  { fr: "Paraguay", iso: "py" }, { fr: "Pérou", iso: "pe" }, { fr: "Uruguay", iso: "uy" },
  { fr: "Venezuela", iso: "ve" },

  // --- CONCACAF ---
  { fr: "Anguilla", iso: "ai" }, { fr: "Antigua-et-Barbuda", iso: "ag" }, { fr: "Aruba", iso: "aw" },
  { fr: "Bahamas", iso: "bs" }, { fr: "Barbade", iso: "bb" }, { fr: "Belize", iso: "bz" },
  { fr: "Bermudes", iso: "bm" }, { fr: "Canada", iso: "ca" }, { fr: "Costa Rica", iso: "cr" },
  { fr: "Cuba", iso: "cu" }, { fr: "Curaçao", iso: "cw" }, { fr: "Dominique", iso: "dm" },
  { fr: "El Salvador", iso: "sv" }, { fr: "États-Unis", iso: "us" }, { fr: "Grenade", iso: "gd" },
  { fr: "Guadeloupe", iso: "gp" }, { fr: "Guatemala", iso: "gt" }, { fr: "Guyana", iso: "gy" },
  { fr: "Guyane française", iso: "gf" }, { fr: "Haïti", iso: "ht" }, { fr: "Honduras", iso: "hn" },
  { fr: "Îles Caïmans", iso: "ky" }, { fr: "Îles Turques-et-Caïques", iso: "tc" },
  { fr: "Îles Vierges américaines", iso: "vi" }, { fr: "Îles Vierges britanniques", iso: "vg" },
  { fr: "Jamaïque", iso: "jm" }, { fr: "Martinique", iso: "mq" }, { fr: "Mexique", iso: "mx" },
  { fr: "Montserrat", iso: "ms" }, { fr: "Nicaragua", iso: "ni" }, { fr: "Panama", iso: "pa" },
  { fr: "Porto Rico", iso: "pr" }, { fr: "République dominicaine", iso: "do" },
  { fr: "Saint-Christophe-et-Niévès", iso: "kn" }, { fr: "Sainte-Lucie", iso: "lc" },
  { fr: "Saint-Martin", iso: "mf" }, { fr: "Saint-Vincent-et-les-Grenadines", iso: "vc" },
  { fr: "Sint Maarten", iso: "sx" }, { fr: "Suriname", iso: "sr" },
  { fr: "Trinité-et-Tobago", iso: "tt" },

  // --- CAF ---
  { fr: "Afrique du Sud", iso: "za" }, { fr: "Algérie", iso: "dz" }, { fr: "Angola", iso: "ao" },
  { fr: "Bénin", iso: "bj" }, { fr: "Botswana", iso: "bw" }, { fr: "Burkina Faso", iso: "bf" },
  { fr: "Burundi", iso: "bi" }, { fr: "Cameroun", iso: "cm" }, { fr: "Cap-Vert", iso: "cv" },
  { fr: "Comores", iso: "km" }, { fr: "Congo", iso: "cg" },
  { fr: "République démocratique du Congo", iso: "cd" }, { fr: "Côte d'Ivoire", iso: "ci" },
  { fr: "Djibouti", iso: "dj" }, { fr: "Égypte", iso: "eg" }, { fr: "Érythrée", iso: "er" },
  { fr: "Eswatini", iso: "sz" }, { fr: "Éthiopie", iso: "et" }, { fr: "Gabon", iso: "ga" },
  { fr: "Gambie", iso: "gm" }, { fr: "Ghana", iso: "gh" }, { fr: "Guinée", iso: "gn" },
  { fr: "Guinée-Bissau", iso: "gw" }, { fr: "Guinée équatoriale", iso: "gq" }, { fr: "Kenya", iso: "ke" },
  { fr: "Lesotho", iso: "ls" }, { fr: "Liberia", iso: "lr" }, { fr: "Libye", iso: "ly" },
  { fr: "Madagascar", iso: "mg" }, { fr: "Malawi", iso: "mw" }, { fr: "Mali", iso: "ml" },
  { fr: "Maroc", iso: "ma" }, { fr: "Maurice", iso: "mu" }, { fr: "Mauritanie", iso: "mr" },
  { fr: "Mozambique", iso: "mz" }, { fr: "Namibie", iso: "na" }, { fr: "Niger", iso: "ne" },
  { fr: "Nigeria", iso: "ng" }, { fr: "Ouganda", iso: "ug" }, { fr: "Rwanda", iso: "rw" },
  { fr: "Sao Tomé-et-Principe", iso: "st" }, { fr: "Sénégal", iso: "sn" }, { fr: "Seychelles", iso: "sc" },
  { fr: "Sierra Leone", iso: "sl" }, { fr: "Somalie", iso: "so" }, { fr: "Soudan", iso: "sd" },
  { fr: "Soudan du Sud", iso: "ss" }, { fr: "Tanzanie", iso: "tz" }, { fr: "Tchad", iso: "td" },
  { fr: "Togo", iso: "tg" }, { fr: "Tunisie", iso: "tn" }, { fr: "Zambie", iso: "zm" },
  { fr: "Zimbabwe", iso: "zw" },

  // --- AFC ---
  { fr: "Afghanistan", iso: "af" }, { fr: "Arabie saoudite", iso: "sa" }, { fr: "Australie", iso: "au" },
  { fr: "Bahreïn", iso: "bh" }, { fr: "Bangladesh", iso: "bd" }, { fr: "Bhoutan", iso: "bt" },
  { fr: "Brunei", iso: "bn" }, { fr: "Cambodge", iso: "kh" }, { fr: "Chine", iso: "cn" },
  { fr: "Corée du Nord", iso: "kp" }, { fr: "Corée du Sud", iso: "kr" },
  { fr: "Émirats arabes unis", iso: "ae" }, { fr: "Guam", iso: "gu" }, { fr: "Hong Kong", iso: "hk" },
  { fr: "Inde", iso: "in" }, { fr: "Indonésie", iso: "id" }, { fr: "Irak", iso: "iq" },
  { fr: "Iran", iso: "ir" }, { fr: "Japon", iso: "jp" }, { fr: "Jordanie", iso: "jo" },
  { fr: "Kirghizistan", iso: "kg" }, { fr: "Koweït", iso: "kw" }, { fr: "Laos", iso: "la" },
  { fr: "Liban", iso: "lb" }, { fr: "Macao", iso: "mo" }, { fr: "Malaisie", iso: "my" },
  { fr: "Maldives", iso: "mv" }, { fr: "Mongolie", iso: "mn" }, { fr: "Myanmar", iso: "mm" },
  { fr: "Népal", iso: "np" }, { fr: "Oman", iso: "om" }, { fr: "Ouzbékistan", iso: "uz" },
  { fr: "Pakistan", iso: "pk" }, { fr: "Palestine", iso: "ps" }, { fr: "Philippines", iso: "ph" },
  { fr: "Qatar", iso: "qa" }, { fr: "Singapour", iso: "sg" }, { fr: "Sri Lanka", iso: "lk" },
  { fr: "Syrie", iso: "sy" }, { fr: "Tadjikistan", iso: "tj" }, { fr: "Taïwan", iso: "tw" },
  { fr: "Thaïlande", iso: "th" }, { fr: "Timor oriental", iso: "tl" }, { fr: "Turkménistan", iso: "tm" },
  { fr: "Vietnam", iso: "vn" }, { fr: "Yémen", iso: "ye" },

  // --- OFC ---
  { fr: "Fidji", iso: "fj" }, { fr: "Îles Cook", iso: "ck" }, { fr: "Îles Salomon", iso: "sb" },
  { fr: "Kiribati", iso: "ki" }, { fr: "Nouvelle-Calédonie", iso: "nc" },
  { fr: "Nouvelle-Zélande", iso: "nz" }, { fr: "Papouasie-Nouvelle-Guinée", iso: "pg" },
  { fr: "Samoa", iso: "ws" }, { fr: "Samoa américaines", iso: "as" }, { fr: "Tahiti", iso: "pf" },
  { fr: "Tonga", iso: "to" }, { fr: "Tuvalu", iso: "tv" }, { fr: "Vanuatu", iso: "vu" }
];

// Dérive le slug d'un nom français : minuscules, diacritiques retirés, caractères non alphanumériques
// supprimés. Doit rester identique à la convention utilisée dans les seeds backend.
function slugify(fr) {
  return fr.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

const here = dirname(fileURLToPath(import.meta.url));
const flagsDir = join(here, "..", "src", "assets", "flags");

async function main() {
  await mkdir(flagsDir, { recursive: true });
  const before = new Set(await readdir(flagsDir));

  // Contrôle d'unicité des slugs (deux noms ne doivent pas produire le même fichier).
  const seen = new Map();
  for (const c of COUNTRIES) {
    const slug = slugify(c.fr);
    if (seen.has(slug)) {
      throw new Error(`Collision de slug "${slug}" : "${seen.get(slug)}" et "${c.fr}"`);
    }
    seen.set(slug, c.fr);
  }

  let ok = 0;
  const failures = [];
  // Téléchargement par petits lots pour ménager flagcdn.
  const batchSize = 12;
  for (let i = 0; i < COUNTRIES.length; i += batchSize) {
    const batch = COUNTRIES.slice(i, i + batchSize);
    await Promise.all(batch.map(async (c) => {
      const slug = slugify(c.fr);
      const url = `https://flagcdn.com/w320/${c.iso}.png`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          failures.push(`${c.fr} (${c.iso}) → HTTP ${res.status}`);
          return;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        await writeFile(join(flagsDir, `${slug}.png`), buffer);
        ok++;
      } catch (error) {
        failures.push(`${c.fr} (${c.iso}) → ${error.message}`);
      }
    }));
  }

  const after = new Set(await readdir(flagsDir));
  const added = [...after].filter((f) => !before.has(f));
  console.log(`Drapeaux : ${ok}/${COUNTRIES.length} téléchargés, ${added.length} nouveaux fichiers, ${after.size} au total.`);
  if (failures.length) {
    console.log(`Échecs (${failures.length}) :\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main();
