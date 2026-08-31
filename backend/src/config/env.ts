import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  HOTSPOT_RADIUS_METERS: z.coerce.number().positive().default(300),
  CLUSTER_RADIUS_METERS: z.coerce.number().positive().default(1000),
});
export const env = schema.parse(process.env);
