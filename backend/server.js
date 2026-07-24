// Crée et configure le serveur Express + Socket.IO.
const express = require("express");
const http = require("http");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const { sendError } = require("./util/message");
const { logInfo, logError, httpLogger } = require("./util/log");

const app = express();
const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Derrière le reverse-proxy Caddy (un seul hop) : faire confiance à X-Forwarded-For pour lire la VRAIE
// IP client (sinon toutes les requêtes semblent venir de localhost → rate-limit inopérant). "1" = 1 proxy,
// ce qui empêche aussi un client de spoofer son IP au-delà de ce hop.
app.set("trust proxy", 1);

// Express 5 parse nativement le corps des requêtes (pas besoin de body-parser).
app.use(express.urlencoded({ extended: true }));
// Limite élargie pour accueillir les photos de profil (base64).
app.use(express.json({ limit: "2mb" }));

// CORS permissif : autorise la WebView Capacitor et le serveur de dev Ionic à joindre l'API.
// En production, le serveur est de toute façon derrière un reverse-proxy HTTPS (voir docs/stack-technique.md).
app.use(cors());

// Journalise CHAQUE requête (route, statut, durée, utilisateur, entrée/sortie masquées). Placé ici,
// après le parsing du corps et avant les routes, il couvre onboarding, routes protégées, 429 et 500.
app.use(httpLogger);

// --- Routes ---
// Chaque fichier de scripts/ enregistre ici sa propre route, au fil des fonctionnalités.

// Onboarding : routes PUBLIQUES (pas d'authentification) — création de compte ET connexion à un
// compte existant via son auth_token (changement d'appareil). Rate-limit anti-flood/bruteforce
// PARTAGÉ par les deux : 5 tentatives / IP / 24 h, en comptant TOUTE requête (succès ou échec).
// Au-delà → 429. attemptsLeft (req.rateLimit.remaining) sert l'UI.
const { createAccount } = require("./scripts/createAccount");
const { login } = require("./scripts/login");
const onboardingLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request, result) => {
        result.status(429).json({ reason: "Trop de tentatives. Réessaie demain.", attemptsLeft: 0 });
    }
});
app.post("/createAccount", onboardingLimiter, (request, result) => { createAccount(request, result); });
app.post("/login", onboardingLimiter, (request, result) => { login(request, result); });

// Profil du joueur authentifié (route protégée : requireAuth résout l'utilisateur via son token).
const { requireAuth, requireAdmin } = require("./util/auth");
const { getMe } = require("./scripts/getMe");
app.post("/me", requireAuth, (request, result) => { getMe(request, result); });

// Compétitions (pour le sélecteur) et matchs à venir (routes protégées).
const { getCompetitions } = require("./scripts/getCompetitions");
app.post("/competitions", requireAuth, (request, result) => { getCompetitions(request, result); });

const { getMatches } = require("./scripts/getMatches");
app.post("/matches", requireAuth, (request, result) => { getMatches(request, result); });

// Poules : équipes, matchs et classement calculé de chaque groupe (route protégée).
const { getGroups } = require("./scripts/getGroups");
app.post("/groups", requireAuth, (request, result) => { getGroups(request, result); });

// Bracket : phase à élimination directe, par tour, avec slots résolus (route protégée).
const { getBracket } = require("./scripts/getBracket");
app.post("/bracket", requireAuth, (request, result) => { getBracket(request, result); });

// Pronostics : contexte de prono d'un match, et création/mise à jour d'un prono (routes protégées).
const { getPrediction } = require("./scripts/getPrediction");
app.post("/prediction", requireAuth, (request, result) => { getPrediction(request, result); });

const { setPrediction } = require("./scripts/setPrediction");
app.post("/setPrediction", requireAuth, (request, result) => { setPrediction(request, result); });

const { getMyPredictions } = require("./scripts/getMyPredictions");
app.post("/myPredictions", requireAuth, (request, result) => { getMyPredictions(request, result); });

// Pronos archivés d'un joueur tiers (affichés sous ses stats sur /user/:id).
const { getUserPredictions } = require("./scripts/getUserPredictions");
app.post("/userPredictions", requireAuth, (request, result) => { getUserPredictions(request, result); });

// Pari « vainqueur de la compétition » : contexte (équipes, pari, verrou) et enregistrement (routes protégées).
const { getChampionBet } = require("./scripts/getChampionBet");
app.post("/championBet", requireAuth, (request, result) => { getChampionBet(request, result); });

const { setChampionBet } = require("./scripts/setChampionBet");
app.post("/setChampionBet", requireAuth, (request, result) => { setChampionBet(request, result); });

// Pari « vainqueur » d'un joueur (sien ou tiers), résolu en équipe, pour l'affichage sous ses stats.
const { getUserChampionBet } = require("./scripts/getUserChampionBet");
app.post("/userChampionBet", requireAuth, (request, result) => { getUserChampionBet(request, result); });

// Admin — saisie des résultats : liste des matchs validables + validation (fige cotes & points). Réservé admin.
const { getAdminMatches } = require("./scripts/getAdminMatches");
app.post("/adminMatches", requireAuth, requireAdmin, (request, result) => { getAdminMatches(request, result); });

const { setResult } = require("./scripts/setResult");
app.post("/setResult", requireAuth, requireAdmin, (request, result) => { setResult(request, result); });

// Admin — placement manuel des équipes dans les cases du bracket (hybride avec l'auto-fill). Réservé admin.
const { getAdminBracket } = require("./scripts/getAdminBracket");
app.post("/adminBracket", requireAuth, requireAdmin, (request, result) => { getAdminBracket(request, result); });

const { setSlot } = require("./scripts/setSlot");
app.post("/setSlot", requireAuth, requireAdmin, (request, result) => { setSlot(request, result); });

// Profil : mise à jour nom / photo / préférences de notifications, et stats (routes protégées).
const { updateName } = require("./scripts/updateName");
app.post("/updateName", requireAuth, (request, result) => { updateName(request, result); });

const { updatePhoto } = require("./scripts/updatePhoto");
app.post("/updatePhoto", requireAuth, (request, result) => { updatePhoto(request, result); });

const { updateNotifPrefs } = require("./scripts/updateNotifPrefs");
app.post("/updateNotifPrefs", requireAuth, (request, result) => { updateNotifPrefs(request, result); });

const { updateFcmToken } = require("./scripts/updateFcmToken");
app.post("/updateFcmToken", requireAuth, (request, result) => { updateFcmToken(request, result); });

const { getStats } = require("./scripts/getStats");
app.post("/stats", requireAuth, (request, result) => { getStats(request, result); });

// Membres : liste des joueurs et profil (identité brève) d'un joueur donné (routes protégées).
const { getUsers } = require("./scripts/getUsers");
app.post("/users", requireAuth, (request, result) => { getUsers(request, result); });

const { getUser } = require("./scripts/getUser");
app.post("/user", requireAuth, (request, result) => { getUser(request, result); });

// Classement des joueurs pour une compétition (route protégée).
const { getLeaderboard } = require("./scripts/getLeaderboard");
app.post("/leaderboard", requireAuth, (request, result) => { getLeaderboard(request, result); });

// Chat global : historique paginé (l'envoi/suppression passent par Socket.IO, voir socket/chatSocket.js).
const { getMessages } = require("./scripts/getMessages");
app.post("/messages", requireAuth, (request, result) => { getMessages(request, result); });

// Message broadcast (annonce de l'organisateur) : lecture pour tous, édition réservée à l'admin.
const { getAnnouncement } = require("./scripts/getAnnouncement");
app.post("/announcement", requireAuth, (request, result) => { getAnnouncement(request, result); });

const { setAnnouncement } = require("./scripts/setAnnouncement");
app.post("/setAnnouncement", requireAuth, requireAdmin, (request, result) => { setAnnouncement(request, result); });

// Middleware d'erreur attrape-tout : renvoie une erreur formatée (util/message).
app.use((err, request, result, next) => {
    logError(err.stack || err.message || String(err));
    sendError(result, err.message || "Erreur serveur inattendue", 500);
});

// --- Serveur HTTP + Socket.IO (chat temps réel) ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Chat global : authentification du socket + events d'envoi/suppression (voir socket/chatSocket.js).
const { registerChatSocket } = require("./socket/chatSocket");
registerChatSocket(io);

// Démarre le serveur, uniquement si ce fichier est lancé directement (pas à l'import : pratique pour les tests).
if (require.main === module) {
    server.listen(port, host, () => {
        logInfo(`Serveur démarré sur http://${host}:${port}`);
    });
}

module.exports = { app, io, server };
