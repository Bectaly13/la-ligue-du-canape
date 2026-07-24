// Configuration PM2 — démarrage 24/7 du backend avec redémarrage automatique.
// Utilisée sur la VM : `pm2 start ecosystem.config.js` (voir docs/deploiement.md).
module.exports = {
  apps: [
    {
      name: "mpp-backend",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
