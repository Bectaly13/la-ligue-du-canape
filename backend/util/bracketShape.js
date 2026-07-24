// Helpers partagés du bracket (utilisés par l'affichage joueur getBracket ET l'outil admin de placement).
// Regroupe les lignes KO en CONFRONTATIONS (match unique ou aller-retour), attribue un code court par
// confrontation, et résout un slot en équipe connue ou libellé de provenance.

const STAGE_CODE = { seizieme: "S", huitieme: "H", quart: "Q", demie: "D", finale: "F", petite_finale: "P" };

const ROUND_LABELS = {
    seizieme: "16es de finale",
    huitieme: "8es de finale",
    quart: "Quarts de finale",
    demie: "Demi-finales",
    finale: "Finale",
    petite_finale: "Petite finale"
};

// Regroupe : chaque confrontation est ancrée par la ligne SANS first_leg_match_id (aller ou match unique) ;
// la manche retour éventuelle est celle qui pointe vers elle.
function buildTies(rows) {
    const retourByAller = new Map();
    for (const r of rows) {
        if (r.first_leg_match_id) {
            retourByAller.set(r.first_leg_match_id, r);
        }
    }
    return rows
        .filter((r) => !r.first_leg_match_id)
        .map((aller) => ({ aller, retour: retourByAller.get(aller.id) || null }));
}

// Code court par confrontation (Q1, D1, F, P), mappé sur SES deux manches (la provenance aval pointe
// vers la manche retour → doit résoudre le code de la confrontation).
function buildCodes(ties) {
    const codeById = new Map();
    const counters = {};
    for (const t of ties) {
        const stage = t.aller.stage;
        const base = STAGE_CODE[stage] || "?";
        const single = stage === "finale" || stage === "petite_finale";
        counters[stage] = (counters[stage] || 0) + 1;
        const code = single ? base : `${base}${counters[stage]}`;
        codeById.set(t.aller.id, code);
        if (t.retour) {
            codeById.set(t.retour.id, code);
        }
    }
    return codeById;
}

// Résout un slot (côté team1/team2, d'après la manche aller) → { team | null, label | null }.
function resolveSlot(aller, side, codeById) {
    if (aller[`${side}_id`]) {
        return { team: { id: aller[`${side}_id`], name: aller[`${side}_name`], slug: aller[`${side}_slug`] }, label: null };
    }
    const srcMatchId = aller[`${side}_src_match_id`];
    if (srcMatchId && codeById.has(srcMatchId)) {
        const type = (aller[`${side}_src_type`] || "").replace("match_", "");
        return { team: null, label: `${type === "loser" ? "Perdant" : "Vainqueur"} ${codeById.get(srcMatchId)}` };
    }
    const rank = aller[`${side}_src_rank`];
    const group = aller[`${side}_src_group`];
    if (rank && group) {
        return { team: null, label: `${rank === 1 ? "1er" : `${rank}e`} ${group}` };
    }
    return { team: null, label: "À déterminer" };
}

module.exports = { STAGE_CODE, ROUND_LABELS, buildTies, buildCodes, resolveSlot };
