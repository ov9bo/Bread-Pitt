/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "bread-pitt",
      script: "cmd",
      args: "/c node_modules\\.bin\\next.CMD dev --port 3000",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
      autorestart: true,
      // Restart up to 10 times within 60s (covers sleep/wake bounce).
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: "development",
      },
      // Stream logs to pm2's log folder
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
