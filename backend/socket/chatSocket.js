// Temps réel du chat global (Socket.IO). Le socket est authentifié avec le même auth_token que l'API.
// L'envoi et la suppression de messages passent par des events (actions live diffusées à tous) ;
// seul l'historique passe par une route REST (voir scripts/getMessages.js).
const { getUserByToken } = require("../sql/sqlUsers");
const sql = require("../sql/sqlMessages");
const { logInfo } = require("../util/log");

// Longueur maximale d'un message (garde-fou anti-abus).
const MAX_LENGTH = 1000;

function registerChatSocket(io) {
    // --- Authentification du socket (handshake) ---
    // Le client fournit son token dans `auth` à la connexion ; on résout l'utilisateur et on l'attache.
    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentification requise"));
        }
        const user = getUserByToken(token);
        if (!user) {
            return next(new Error("Token invalide"));
        }
        socket.user = user;
        next();
    });

    io.on("connection", (socket) => {
        logInfo(`SOCKET connect user=${socket.user.id} sid=${socket.id}`);
        socket.on("disconnect", (reason) => {
            logInfo(`SOCKET disconnect user=${socket.user.id} sid=${socket.id} ${reason}`);
        });

        // Envoi d'un message : validation, insertion, puis diffusion à tous les clients connectés.
        socket.on("message:send", (payload, ack) => {
            const content = (payload && typeof payload.content === "string" ? payload.content : "").trim();
            if (!content) {
                return respond(ack, { ok: false, reason: "Message vide" });
            }
            if (content.length > MAX_LENGTH) {
                return respond(ack, { ok: false, reason: "Message trop long" });
            }
            const message = sql.insertMessage(socket.user.id, content);
            io.emit("message:new", message);
            logInfo(`SOCKET message:send user=${socket.user.id} id=${message.id}`);
            respond(ack, { ok: true });
        });

        // Suppression d'un message : autorisée à son auteur ou à l'admin ; diffusée à tous.
        socket.on("message:delete", (payload, ack) => {
            const messageId = payload && payload.messageId;
            const message = messageId ? sql.getMessageById(messageId) : null;
            if (!message) {
                return respond(ack, { ok: false, reason: "Message introuvable" });
            }
            if (message.sender_id !== socket.user.id && !socket.user.is_admin) {
                return respond(ack, { ok: false, reason: "Suppression non autorisée" });
            }
            sql.deleteMessage(message.id);
            io.emit("message:deleted", { id: message.id });
            logInfo(`SOCKET message:delete user=${socket.user.id} id=${message.id}`);
            respond(ack, { ok: true });
        });
    });
}

// Répond au client via l'accusé (ack) uniquement s'il en a fourni un.
function respond(ack, data) {
    if (typeof ack === "function") {
        ack(data);
    }
}

module.exports = { registerChatSocket };
