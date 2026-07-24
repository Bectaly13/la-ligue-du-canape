// Orchestration des notifications push liées aux résultats. Isole la construction des messages et la
// diffusion (boucle sur les destinataires) ; l'envoi bas niveau reste dans util/push.js (FCM).
const { sendToToken } = require("./push");
const sql = require("../sql/sqlResults");
const sqlUsers = require("../sql/sqlUsers");

// « pt » / « pts » (0 est au pluriel, comme dans l'app). Le pluriel est géré même à 1 point : si le
// gain plancher venait à descendre à 1, l'affichage resterait correct (« +1 pt »).
function plural(points) {
    return Math.abs(points) === 1 ? "pt" : "pts";
}

// Corps du push pour un destinataire, selon SON prono (points = ses points figés, bonus exact inclus) :
//  - pas de prono   → juste le score              (ex. « France 2–1 Italie »)
//  - prono exact    → « … — +86 pts (Prono exact !) »
//  - autre prono    → « … — +56 pts (Ton prono : 1–0) »  (bon comme mauvais, +0 compris)
function buildBody(scoreline, target, score1, score2) {
    // Pas de prono (LEFT JOIN sans ligne) → seulement le score.
    if (target.predicted_score1 === null || target.predicted_score1 === undefined) {
        return scoreline;
    }
    const points = target.points_awarded ?? 0;
    const exact = target.predicted_score1 === score1 && target.predicted_score2 === score2;
    const detail = exact
        ? "Prono exact !"
        : `Ton prono : ${target.predicted_score1}–${target.predicted_score2}`;
    return `${scoreline} — +${points} ${plural(points)} (${detail})`;
}

// Notifie le score d'un match aux utilisateurs opt-in. Personnalisé : chaque parieur voit SES points.
// Résilient : un échec d'envoi n'interrompt pas les autres (chaque push est indépendant).
async function notifyMatchResult(matchId, score1, score2) {
    const label = sql.getMatchLabel(matchId);
    if (!label) {
        return;
    }
    const scoreline = `${label.team1_name} ${score1}–${score2} ${label.team2_name}`;
    const targets = sql.getScoreNotifTargets(matchId);
    for (const target of targets) {
        await sendToToken(target.fcm_token, "Score final", buildBody(scoreline, target, score1, score2));
    }
}

// Notifie une annonce de l'organisateur (message broadcast) à tous les utilisateurs opt-in (notifs
// globales activées). Résilient : un échec d'envoi n'interrompt pas les autres.
async function notifyBroadcast(content) {
    const targets = sqlUsers.getAnnouncementNotifTargets();
    for (const target of targets) {
        await sendToToken(target.fcm_token, "Annonce de l'organisateur", content);
    }
}

module.exports = { notifyMatchResult, notifyBroadcast };
