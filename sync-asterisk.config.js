module.exports = {
  apps: [
    {
      name: "sync-Asterisk",
      script: "npm",
      args: "start",
      watch: true,
      env: {
        NODE_ENV: "development",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 500,
    },
  ],
};