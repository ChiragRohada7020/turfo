module.exports = {
  apps: [
    {
      name: 'turf-app',
      script: 'server.js',
      cwd: '/app',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/turf-app-error.log',
      out_file: '/var/log/pm2/turf-app-out.log',
      log_file: '/var/log/pm2/turf-app-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
    },
  ],
}