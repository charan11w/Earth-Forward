import type { CorsOptions } from 'cors';

// Production accepts only explicitly configured origins. Development also
// accepts loopback origins when Vite advances to another available port.
export function createCorsOptions(clientOrigins: string, nodeEnv: string): CorsOptions {
  const allowed = new Set(clientOrigins.split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean));
  return {
    credentials: true,
    origin(origin, callback) {
      const local = nodeEnv === 'development' && !!origin &&
        /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
      callback(null, !origin || allowed.has(origin) || local);
    }
  };
}

