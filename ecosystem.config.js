module.exports = {
  apps: [{
    name: "bybitbot",
    script: "server.js",
    watch: true,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 4001
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    log_file: "logs/combined.log",
    time: true,
    autorestart: true,
    restart_delay: 4000,
    max_restarts: 10
  }]
} 