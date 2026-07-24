// Requêtes de l'outil admin de PLACEMENT manuel des équipes dans les cases du bracket.
const { db, get } = require("./sqlConnect");
const { matches } = require("./sqlConfig");

// La manche RETOUR d'un match aller (celle qui pointe vers lui), ou undefined.
function getRetourOf(matchId) {
    return get(`SELECT id, team1_id, team2_id FROM "${matches}" WHERE first_leg_match_id = ?`, [matchId]);
}

// Applique en une transaction des placements de slot : writes = [{ matchId, side, teamId }].
// Chaque placement fixe team{side}_id ET efface la provenance de ce côté → la case devient MANUELLE
// (l'auto-fill ne la touchera plus). teamId peut être null (vider une case).
const applySlotPlacements = db.transaction((writes) => {
    const stmt = {
        team1: db.prepare(`UPDATE "${matches}" SET team1_id = ?, team1_src_type = NULL, team1_src_group_id = NULL, team1_src_rank = NULL, team1_src_match_id = NULL WHERE id = ?`),
        team2: db.prepare(`UPDATE "${matches}" SET team2_id = ?, team2_src_type = NULL, team2_src_group_id = NULL, team2_src_rank = NULL, team2_src_match_id = NULL WHERE id = ?`)
    };
    for (const w of writes) {
        stmt[w.side].run(w.teamId, w.matchId);
    }
});

module.exports = { getRetourOf, applySlotPlacements };
