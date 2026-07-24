// Projection « publique » d'un utilisateur : tout sauf le secret (auth_token) et le fcm_token.
// Utilisée par /me et les endpoints qui renvoient le profil courant.
function publicUser(u) {
    return {
        id: u.id,
        name: u.name,
        is_admin: u.is_admin,
        notif_enabled: u.notif_enabled,
        reminder_notif_enabled: u.reminder_notif_enabled,
        score_notif_enabled: u.score_notif_enabled,
        announcement_notif_enabled: u.announcement_notif_enabled,
        photo: u.photo,
        created_at: u.created_at
    };
}

// Projection « brève » d'un utilisateur : uniquement l'identité visible par les autres joueurs
// (id public, pseudo, photo). Utilisée par la liste des membres et le profil d'un tiers.
function publicUserBrief(u) {
    return {
        id: u.id,
        name: u.name,
        photo: u.photo,
        is_admin: u.is_admin
    };
}

module.exports = { publicUser, publicUserBrief };
