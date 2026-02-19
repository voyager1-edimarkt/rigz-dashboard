module.exports = {
  apps: [
    {
      name: "rigz-dashboard",
      script: "dist/index.cjs",
      cwd: "/opt/rigz-dashboard",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/rigz-dashboard/error.log",
      out_file: "/var/log/rigz-dashboard/out.log",
      merge_logs: true,
    },
  ],
};
