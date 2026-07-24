// Classement d'une poule, calculé depuis ses équipes et ses matchs terminés (rien n'est stocké).
// Points 3/1/0 ; départage : différence de buts, puis buts marqués, puis nom (les confrontations
// directes, départage officiel, ne sont pas gérées en v1). Partagé par getGroups et l'auto-fill du bracket.

// groupTeams : [{ id, display_name, slug }] ; groupMatches : [{ status, score1, score2, team1_id, team2_id }].
function computeStandings(groupTeams, groupMatches) {
    const rows = new Map();
    for (const t of groupTeams) {
        rows.set(t.id, {
            team: { id: t.id, name: t.display_name, slug: t.slug },
            played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0
        });
    }

    for (const m of groupMatches) {
        // Seulement les matchs terminés au score renseigné et aux deux équipes connues.
        if (m.status !== "finished" || m.score1 === null || m.score2 === null) {
            continue;
        }
        const a = rows.get(m.team1_id);
        const b = rows.get(m.team2_id);
        if (!a || !b) {
            continue;
        }
        a.played++; b.played++;
        a.goals_for += m.score1; a.goals_against += m.score2;
        b.goals_for += m.score2; b.goals_against += m.score1;
        if (m.score1 > m.score2) {
            a.won++; a.points += 3; b.lost++;
        } else if (m.score1 < m.score2) {
            b.won++; b.points += 3; a.lost++;
        } else {
            a.drawn++; b.drawn++; a.points++; b.points++;
        }
    }

    const standings = [...rows.values()];
    for (const r of standings) {
        r.goal_diff = r.goals_for - r.goals_against;
    }
    standings.sort((x, y) =>
        y.points - x.points ||
        y.goal_diff - x.goal_diff ||
        y.goals_for - x.goals_for ||
        x.team.name.localeCompare(y.team.name)
    );
    standings.forEach((r, i) => { r.rank = i + 1; });
    return standings;
}

module.exports = { computeStandings };
