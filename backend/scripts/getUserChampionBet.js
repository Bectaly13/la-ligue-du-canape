// Pari « vainqueur » d'un joueur (le sien ou un tiers), résolu en équipe, pour affichage en lecture seule
// sous ses stats. Sans conflit d'intérêt : le pari vainqueur peut être public même avant le début. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { CHAMPION_BONUS } = require("../util/odds");
const sql = require("../sql/sqlChampionBets");

async function getUserChampionBet(request, result) {
    const { userId, competitionId } = request.body;
    if (!userId || !competitionId) {
        return sendError(result, "userId et competitionId requis");
    }

    const row = sql.getUserChampionTeam(userId, competitionId);
    const team = row ? { id: row.id, name: row.name, slug: row.slug } : null;
    const points = row ? row.points : null;

    return sendMessage(result, { team, points, reward: CHAMPION_BONUS });
}

module.exports = { getUserChampionBet };
