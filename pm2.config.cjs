/**
 * PM2 process config for production.
 *
 * Usage:
 *   npm install -g pm2
 *   pm2 start pm2.config.cjs
 *   pm2 save          # persist across reboots
 *   pm2 startup       # generate systemd/init.d hook
 *
 * Two processes run side-by-side sharing the same Redis and Postgres:
 *   - coldpegion-web    → Next.js server  (npm run start)
 *   - coldpegion-worker → BullMQ worker   (npm run worker)
 *
 * The worker MUST be running for campaigns to send. If it crashes PM2
 * will restart it automatically (max 10 times, then exponential backoff).
 */
module.exports = {
  apps: [
    {
      name: "coldpegion-web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "coldpegion-worker",
      script: "node_modules/.bin/tsx",
      args: "scripts/start-worker.ts",
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
