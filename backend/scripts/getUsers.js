// Renvoie la liste des membres (identité brève : id, pseudo, photo). Route protégée.
const { sendMessage } = require("../util/message");
const { publicUserBrief } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function getUsers(request, result) {
    const users = sql.getAllUsers().map(publicUserBrief);
    return sendMessage(result, users);
}

module.exports = { getUsers };
