module.exports = {
    apps: [
      {
        name: "Sync-Asterisk",
        script: "npm",
        args: "start",
        watch: true,
        env: {
          NODE_ENV: "development",
        },
      },
    ],
  };