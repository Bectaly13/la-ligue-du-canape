// Résolution du pari « vainqueur de la compétition ». Aucune action admin dédiée : dès que la FINALE est
// tranchée (score du match unique, ou cumul aller-retour), on connaît le champion → on fige les points de
// tous les paris. Déclenché par setResult (après l'auto-fill). Idempotent (re-résolution après correction).
const { tieResult } = require("./autofill");
const { CHAMPION_BONUS } = require("./odds");
const sqlAuto = require("../sql/sqlAutofill");
const sqlChampion = require("../sql/sqlChampionBets");

function resolveChampion(competitionId) {
    const ko = sqlAuto.getKnockoutMatches(competitionId);
    const finales = ko.filter((m) => m.stage === "finale");
    if (!finales.length) {
        return null;
    }
    const koById = new Map(ko.map((m) => [m.id, m]));

    // Match décisif de la finale : la manche RETOUR si aller-retour, sinon le match unique.
    const deciding = finales.find((f) => f.first_leg_match_id)
        || finales.find((f) => !finales.some((o) => o.first_leg_match_id === f.id));

    const res = tieResult(deciding, koById);
    if (!res) {
        return null; // finale pas encore tranchée
    }

    sqlChampion.resolveChampionPoints(competitionId, res.winner, CHAMPION_BONUS);
    return res.winner;
}

module.exports = { resolveChampion };
