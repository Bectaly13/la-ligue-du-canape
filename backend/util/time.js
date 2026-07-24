// « Maintenant » en heure de Paris, au même format texte que les kickoff_at stockés
// ("YYYY-MM-DDTHH:MM:SS") → comparable directement par ordre lexicographique.
function nowInParis() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).replace(" ", "T");
}

module.exports = { nowInParis };
