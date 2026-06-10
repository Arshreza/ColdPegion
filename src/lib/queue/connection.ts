import type { ConnectionOptions } from "bullmq";

// Redis Connection configuration for BullMQ
export const getRedisConnection = (): ConnectionOptions => {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
      tls: (process.env.REDIS_URL.startsWith("rediss://") || url.hostname.includes("upstash.io")) ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};
