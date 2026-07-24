// Seed COMPLET et UNIQUE de la Ligue des Nations 2027 (Ligue A) : compétition + 4 groupes + 16 équipes
// + 48 matchs de poule + phase finale (quarts en ALLER-RETOUR → demies / petite finale / finale en
// matchs SIMPLES). Les anciens seeds de démonstration ont été retirés : ceci est le seul seed du projet.
// - Idempotent ET préservateur d'ids : si la compétition existe déjà, on la GARDE (elle, ses groupes et
//   ses équipes conservent leurs ids), on ne reconstruit que les matchs (autoincrément des matchs remis
//   à 1). Sur une base vierge, création complète classique.
// - Phase finale : quarts et demies sont TIRÉS AU SORT (appariements non déductibles) → équipes « à
//   déterminer », auto-remplissage désactivé, l'admin les place après chaque tirage. Finale et petite
//   finale sont LINÉAIRES (vainqueur/perdant des demies) → provenance conservée, auto-remplissage actif.
// - Heures de coup d'envoi stockées en HEURE DE PARIS. L'UEFA programme tous les matchs à l'heure
//   d'Europe centrale (CET/CEST = heure de Paris) : dans une même journée d'un groupe, les deux matchs
//   se jouent donc EN DUPLEX à 20h45 (Paris), sauf quelques levers de rideau à 18h00. Les heures locales
//   des stades (ex. 19h45 à Lisbonne/Londres/Cardiff, 21h45 en Turquie/Grèce) ne sont pas stockées.
//   Source : calendrier officiel de la Ligue A 2026-27 (tirage du 12/02/2026).
// Lancement : node seed/seedLdn2027.js
const { db } = require("../sql/sqlConnect");

const COMPETITION = { name: "Ligue des Nations 2027", start_at: "2026-09-24", end_at: "2027-06-30" };

// Équipe → slug (sans espace ni diacritique).
const SLUGS = {
    "France": "france", "Italie": "italie", "Belgique": "belgique", "Turquie": "turquie",
    "Allemagne": "allemagne", "Pays-Bas": "paysbas", "Serbie": "serbie", "Grèce": "grece",
    "Espagne": "espagne", "Croatie": "croatie", "Angleterre": "angleterre", "Tchéquie": "tchequie",
    "Portugal": "portugal", "Danemark": "danemark", "Norvège": "norvege", "Pays de Galles": "paysdegalles"
};

// Groupe → équipes.
const GROUPS = {
    "A1": ["France", "Italie", "Belgique", "Turquie"],
    "A2": ["Allemagne", "Pays-Bas", "Serbie", "Grèce"],
    "A3": ["Espagne", "Croatie", "Angleterre", "Tchéquie"],
    "A4": ["Portugal", "Danemark", "Norvège", "Pays de Galles"]
};

// Matchs de poule : [groupe, coup d'envoi (heure de Paris), équipe 1 (hôte), équipe 2]. 20h45 partout,
// sauf cinq levers de rideau à 18h00. Calendrier officiel de la Ligue A 2026-27 (6 journées A/R).
const MATCHES = [
    // Groupe A1 — France, Italie, Belgique, Turquie
    ["A1", "2026-09-25T20:45:00", "Italie", "Belgique"],
    ["A1", "2026-09-25T20:45:00", "Turquie", "France"],
    ["A1", "2026-09-28T20:45:00", "Belgique", "France"],
    ["A1", "2026-09-28T20:45:00", "Turquie", "Italie"],
    ["A1", "2026-10-02T20:45:00", "France", "Italie"],
    ["A1", "2026-10-02T20:45:00", "Belgique", "Turquie"],
    ["A1", "2026-10-05T20:45:00", "France", "Belgique"],
    ["A1", "2026-10-05T20:45:00", "Italie", "Turquie"],
    ["A1", "2026-11-12T18:00:00", "Turquie", "Belgique"],
    ["A1", "2026-11-12T20:45:00", "Italie", "France"],
    ["A1", "2026-11-15T20:45:00", "France", "Turquie"],
    ["A1", "2026-11-15T20:45:00", "Belgique", "Italie"],
    // Groupe A2 — Allemagne, Pays-Bas, Serbie, Grèce
    ["A2", "2026-09-24T20:45:00", "Pays-Bas", "Allemagne"],
    ["A2", "2026-09-24T20:45:00", "Serbie", "Grèce"],
    ["A2", "2026-09-27T18:00:00", "Serbie", "Pays-Bas"],
    ["A2", "2026-09-27T20:45:00", "Allemagne", "Grèce"],
    ["A2", "2026-10-01T20:45:00", "Allemagne", "Serbie"],
    ["A2", "2026-10-01T20:45:00", "Grèce", "Pays-Bas"],
    ["A2", "2026-10-04T20:45:00", "Pays-Bas", "Serbie"],
    ["A2", "2026-10-04T20:45:00", "Grèce", "Allemagne"],
    ["A2", "2026-11-13T20:45:00", "Pays-Bas", "Grèce"],
    ["A2", "2026-11-13T20:45:00", "Serbie", "Allemagne"],
    ["A2", "2026-11-16T20:45:00", "Allemagne", "Pays-Bas"],
    ["A2", "2026-11-16T20:45:00", "Grèce", "Serbie"],
    // Groupe A3 — Espagne, Croatie, Angleterre, Tchéquie
    ["A3", "2026-09-26T20:45:00", "Angleterre", "Espagne"],
    ["A3", "2026-09-26T20:45:00", "Tchéquie", "Croatie"],
    ["A3", "2026-09-29T20:45:00", "Espagne", "Croatie"],
    ["A3", "2026-09-29T20:45:00", "Tchéquie", "Angleterre"],
    ["A3", "2026-10-03T18:00:00", "Croatie", "Angleterre"],
    ["A3", "2026-10-03T20:45:00", "Espagne", "Tchéquie"],
    ["A3", "2026-10-06T20:45:00", "Angleterre", "Tchéquie"],
    ["A3", "2026-10-06T20:45:00", "Croatie", "Espagne"],
    ["A3", "2026-11-12T20:45:00", "Angleterre", "Croatie"],
    ["A3", "2026-11-12T20:45:00", "Tchéquie", "Espagne"],
    ["A3", "2026-11-15T20:45:00", "Croatie", "Tchéquie"],
    ["A3", "2026-11-15T20:45:00", "Espagne", "Angleterre"],
    // Groupe A4 — Portugal, Danemark, Norvège, Pays de Galles
    ["A4", "2026-09-24T20:45:00", "Portugal", "Pays de Galles"],
    ["A4", "2026-09-24T20:45:00", "Norvège", "Danemark"],
    ["A4", "2026-09-27T18:00:00", "Danemark", "Pays de Galles"],
    ["A4", "2026-09-27T20:45:00", "Norvège", "Portugal"],
    ["A4", "2026-10-01T20:45:00", "Danemark", "Portugal"],
    ["A4", "2026-10-01T20:45:00", "Pays de Galles", "Norvège"],
    ["A4", "2026-10-04T20:45:00", "Portugal", "Norvège"],
    ["A4", "2026-10-04T20:45:00", "Pays de Galles", "Danemark"],
    ["A4", "2026-11-14T18:00:00", "Norvège", "Pays de Galles"],
    ["A4", "2026-11-14T20:45:00", "Portugal", "Danemark"],
    ["A4", "2026-11-17T20:45:00", "Danemark", "Norvège"],
    ["A4", "2026-11-17T20:45:00", "Pays de Galles", "Portugal"]
];

// --- Phase finale ---
// Dates (heure de Paris) : quarts aller-retour du 25 au 29 mars 2027 (fenêtre officielle 25-30 mars) ;
// « Final Four » du 9 au 13 juin 2027. Heures provisoires (hôte du Final Four non connu au seed).
const BRACKET_DATES = {
    QF1: { aller: "2027-03-25T20:45:00", retour: "2027-03-28T20:45:00" },
    QF2: { aller: "2027-03-25T20:45:00", retour: "2027-03-28T20:45:00" },
    QF3: { aller: "2027-03-26T20:45:00", retour: "2027-03-29T20:45:00" },
    QF4: { aller: "2027-03-26T20:45:00", retour: "2027-03-29T20:45:00" },
    demie1: "2027-06-09T20:45:00",
    demie2: "2027-06-10T20:45:00",
    petite_finale: "2027-06-13T18:00:00",
    finale: "2027-06-13T20:45:00"
};

// Quarts de finale : leurs 4 confrontations (aller-retour). Les appariements sont TIRÉS AU SORT après
// les poules, donc non figés ici — les équipes restent « à déterminer » jusqu'au placement par l'admin.
const QF_KEYS = ["QF1", "QF2", "QF3", "QF4"];

const seed = db.transaction(() => {
    // La compétition existe-t-elle déjà ? On PRÉSERVE alors ses ids (elle, groupes, équipes) et on ne
    // reconstruit que les matchs. Sinon, création complète sur base vierge.
    const existing = db.prepare(`SELECT id FROM "${"competitions"}" WHERE name = ?`).get(COMPETITION.name);

    let compId;
    const groupId = {};   // label → id
    const teamId = {};    // nom d'équipe → id

    if (existing) {
        compId = existing.id;
        // Purge des pronos (dépendants des matchs) puis des matchs de la compétition.
        db.prepare("DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE competition_id = ?)").run(compId);
        db.prepare("DELETE FROM matches WHERE competition_id = ?").run(compId);
        db.prepare("UPDATE competitions SET start_at = ?, end_at = ? WHERE id = ?").run(COMPETITION.start_at, COMPETITION.end_at, compId);
        // Autoincrément des matchs remis à 1 — seulement s'il ne reste aucun match (d'une autre
        // compétition), pour ne jamais provoquer de collision d'id.
        if (db.prepare("SELECT COUNT(*) AS c FROM matches").get().c === 0) {
            db.prepare("DELETE FROM sqlite_sequence WHERE name = 'matches'").run();
        }
        // Relecture des groupes et équipes existants (mêmes ids conservés).
        for (const row of db.prepare('SELECT id, label FROM "groups" WHERE competition_id = ?').all(compId)) {
            groupId[row.label] = row.id;
        }
        for (const row of db.prepare("SELECT id, display_name FROM teams WHERE competition_id = ?").all(compId)) {
            teamId[row.display_name] = row.id;
        }
    } else {
        // Compétition
        compId = db.prepare("INSERT INTO competitions (name, start_at, end_at) VALUES (?, ?, ?)")
            .run(COMPETITION.name, COMPETITION.start_at, COMPETITION.end_at).lastInsertRowid;

        // Groupes
        const insGroup = db.prepare('INSERT INTO "groups" (label, competition_id) VALUES (?, ?)');
        for (const label of Object.keys(GROUPS)) {
            groupId[label] = insGroup.run(label, compId).lastInsertRowid;
        }

        // Équipes
        const insTeam = db.prepare("INSERT INTO teams (display_name, slug, competition_id, group_id) VALUES (?, ?, ?, ?)");
        for (const [label, teams] of Object.entries(GROUPS)) {
            for (const name of teams) {
                teamId[name] = insTeam.run(name, SLUGS[name], compId, groupId[label]).lastInsertRowid;
            }
        }
    }

    // Matchs de poule (toujours reconstruits)
    const insMatch = db.prepare(
        "INSERT INTO matches (competition_id, stage, group_id, kickoff_at, team1_id, team2_id) VALUES (?, 'poule', ?, ?, ?, ?)"
    );
    for (const [label, kickoff, t1, t2] of MATCHES) {
        insMatch.run(compId, groupId[label], kickoff, teamId[t1], teamId[t2]);
    }

    // Phase finale (élimination directe). Aucune équipe connue au seed : uniquement la provenance
    // (group_position pour les quarts ; vainqueur/perdant pour la suite → pointe vers la manche RETOUR).
    const insKo = db.prepare(`
        INSERT INTO matches (
            competition_id, stage, kickoff_at,
            team1_src_type, team1_src_group_id, team1_src_rank, team1_src_match_id,
            team2_src_type, team2_src_group_id, team2_src_rank, team2_src_match_id,
            first_leg_match_id
        ) VALUES (
            @compId, @stage, @kickoff,
            @t1type, @t1gid, @t1rank, @t1mid,
            @t2type, @t2gid, @t2rank, @t2mid,
            @firstLeg
        )
    `);
    // Une « case » = provenance d'un participant : vainqueur/perdant d'un match (LINÉAIRE), ou « à
    // déterminer » quand le participant sort d'un TIRAGE AU SORT (pas d'auto-remplissage : placement admin).
    const fromWinner = (matchId) => ({ type: "match_winner", mid: matchId });
    const fromLoser = (matchId) => ({ type: "match_loser", mid: matchId });
    const toBeDrawn = () => ({ type: null });
    const insLeg = (stage, kickoff, home, away, firstLeg) => insKo.run({
        compId, stage, kickoff,
        t1type: home.type, t1gid: home.gid ?? null, t1rank: home.rank ?? null, t1mid: home.mid ?? null,
        t2type: away.type, t2gid: away.gid ?? null, t2rank: away.rank ?? null, t2mid: away.mid ?? null,
        firstLeg
    }).lastInsertRowid;
    // Confrontation ALLER-RETOUR : domicile inversé au retour ; le retour pointe vers l'aller.
    const insTie = (stage, dates, a, b) => {
        const aller = insLeg(stage, dates.aller, a, b, null);
        const retour = insLeg(stage, dates.retour, b, a, aller);
        return { aller, retour };
    };
    // Match SIMPLE : une seule ligne, sans first_leg_match_id.
    const insSingle = (stage, kickoff, a, b) => insLeg(stage, kickoff, a, b, null);

    // Quarts : appariements tirés au sort → deux cases « à déterminer ». Chaque quart reste en aller-retour ;
    // quand l'admin placera une équipe dans l'aller, setSlot synchronisera automatiquement le retour.
    const qf = {};
    for (const key of QF_KEYS) {
        qf[key] = insTie("quart", BRACKET_DATES[key], toBeDrawn(), toBeDrawn());
    }
    // Demies : Final Four → tirage au sort des 4 vainqueurs de quart → cases « à déterminer ».
    const sf1 = insSingle("demie", BRACKET_DATES.demie1, toBeDrawn(), toBeDrawn());
    const sf2 = insSingle("demie", BRACKET_DATES.demie2, toBeDrawn(), toBeDrawn());
    // Finale et petite finale : LINÉAIRES (vainqueur/perdant des demies) → provenance conservée, autofill actif.
    insSingle("petite_finale", BRACKET_DATES.petite_finale, fromLoser(sf1), fromLoser(sf2));
    insSingle("finale", BRACKET_DATES.finale, fromWinner(sf1), fromWinner(sf2));

    return {
        compId,
        preserved: !!existing,
        groups: Object.keys(groupId).length,
        teams: Object.keys(teamId).length,
        pouleMatches: MATCHES.length,
        koMatches: QF_KEYS.length * 2 + 4
    };
});

const res = seed();
console.log("Seed terminé :", res);
