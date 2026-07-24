// Renvoie le profil du joueur authentifié (résolu par requireAuth via son auth_token).
// La projection publicUser exclut le secret (auth_token) et le fcm_token.
const { sendMessage } = require("../util/message");
const { publicUser } = require("../util/user");

async function getMe(request, result) {
    return sendMessage(result, publicUser(request.user));
}

module.exports = { getMe };
