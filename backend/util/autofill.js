// Auto-remplissage du bracket : à partir des seuls résultats saisis, place les équipes qualifiées dans
// les bonnes cases (qualifiés de poule + vainqueurs/perdants des confrontations), en cascade.
// Gère les confrontations à MATCH UNIQUE et en ALLER-RETOUR (vainqueur au cumul ; si cumul à égalité après
// le retour → t.a.b. du match retour, cf. décision produit). Ne touche jamais un match déjà validé.
const { computeStandings } = require("./standings");
const sqlAuto = require("../sql/sqlAutofill");
const sqlGroups = require("../sql/sqlGroups");

// Normalise le type de provenance : "match_winner"/"winner" → "winner" ; idem "loser" ; "group_position"
// inchangé (les seeds sont hétérogènes : "winner"/"loser" vs "match_winner", on tolère les deux).
function normalizeSrc(type) {
    if (!type) {
        return null;
    }
    if (type === "group_position") {
        return "group_position";
    }
    return type.replace("match_", "");
}

// Buts d'une équipe dans un match (score de son côté), 0 si elle n'y joue pas.
function goalsOf(match, teamId) {
    if (match.team1_id === teamId) {
        return match.score1;
    }
    if (match.team2_id === teamId) {
        return match.score2;
    }
    return 0;
}

// Départage aux tirs au but (garanti départageant par setResult sur un nul en élim directe).
function penaltyResult(m) {
    return m.penalty_score1 > m.penalty_score2
        ? { winner: m.team1_id, loser: m.team2_id }
        : { winner: m.team2_id, loser: m.team1_id };
}

// Vainqueur/perdant d'une confrontation dont le match DÉCISIF est `deciding` (match unique ou manche
// retour). Renvoie { winner, loser } (ids), ou null si la confrontation n'est pas encore tranchée.
function tieResult(deciding, koById) {
    if (!deciding || deciding.status !== "finished" || deciding.team1_id == null || deciding.team2_id == null) {
        return null;
    }
    // Match unique.
    if (deciding.first_leg_match_id == null) {
        if (deciding.score1 > deciding.score2) {
            return { winner: deciding.team1_id, loser: deciding.team2_id };
        }
        if (deciding.score1 < deciding.score2) {
            return { winner: deciding.team2_id, loser: deciding.team1_id };
        }
        return penaltyResult(deciding);
    }
    // Aller-retour : vainqueur au cumul des deux manches.
    const aller = koById.get(deciding.first_leg_match_id);
    if (!aller || aller.status !== "finished") {
        return null;
    }
    const t1 = deciding.team1_id;
    const t2 = deciding.team2_id;
    const agg1 = goalsOf(aller, t1) + goalsOf(deciding, t1);
    const agg2 = goalsOf(aller, t2) + goalsOf(deciding, t2);
    if (agg1 > agg2) {
        return { winner: t1, loser: t2 };
    }
    if (agg1 < agg2) {
        return { winner: t2, loser: t1 };
    }
    // Cumul à égalité → t.a.b. du match retour (pas de règle du but à l'extérieur).
    return penaltyResult(deciding);
}

// Remplit les cases résolvables du bracket, en cascade. Ne touche jamais un match validé. Idempotent
// (re-résout aussi les cases aval NON validées après correction d'un résultat amont). Renvoie le nb d'écritures.
function autoFill(competitionId) {
    const koMatches = sqlAuto.getKnockoutMatches(competitionId);
    const koById = new Map(koMatches.map((m) => [m.id, m]));

    // Classements de poule + complétude par groupe (pour la provenance group_position).
    const groupTeams = sqlGroups.getGroupTeams(competitionId);
    const groupMatches = sqlGroups.getGroupMatches(competitionId);
    const groupIds = [...new Set(groupTeams.map((t) => t.group_id))];
    const standingsByGroup = new Map();
    const groupComplete = new Map();
    for (const gid of groupIds) {
        const gt = groupTeams.filter((t) => t.group_id === gid);
        const gm = groupMatches.filter((m) => m.group_id === gid);
        standingsByGroup.set(gid, computeStandings(gt, gm));
        groupComplete.set(gid, gm.length > 0 && gm.every((m) => m.status === "finished"));
    }

    // Équipe résolue pour un côté d'un match, ou null si pas encore déterminable.
    const resolveSide = (m, side) => {
        const type = normalizeSrc(m[`${side}_src_type`]);
        if (type === "winner" || type === "loser") {
            const res = tieResult(koById.get(m[`${side}_src_match_id`]), koById);
            return res ? res[type] : null;
        }
        if (type === "group_position") {
            const gid = m[`${side}_src_group_id`];
            if (!groupComplete.get(gid)) {
                return null;
            }
            const st = standingsByGroup.get(gid);
            const row = st && st[m[`${side}_src_rank`] - 1];
            return row ? row.team.id : null;
        }
        return null;
    };

    // Boucle jusqu'à stabilité (résoudre une case peut débloquer le tour suivant).
    const writes = [];
    let changed = true;
    while (changed) {
        changed = false;
        for (const m of koMatches) {
            if (m.status === "finished") {
                continue;
            }
            for (const side of ["team1", "team2"]) {
                const team = resolveSide(m, side);
                // Uniquement une valeur résolue et différente (permet la re-résolution après correction) ;
                // on ne remet jamais une case à null.
                if (team != null && m[`${side}_id`] !== team) {
                    m[`${side}_id`] = team;
                    writes.push({ matchId: m.id, side, teamId: team });
                    changed = true;
                }
            }
        }
    }

    if (writes.length) {
        sqlAuto.applyTeamFills(writes);
    }
    return writes.length;
}

module.exports = { autoFill, tieResult };
