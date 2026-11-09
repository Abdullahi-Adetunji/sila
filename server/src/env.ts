import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SILA_KEK: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  // Dedicated HMAC key for the volunteer participant-code lookup. Kept
  // separate from SESSION_SECRET so rotating one does not invalidate the
  // other and so the volunteer domain never shares a key with auth.
  VOLUNTEER_HMAC_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Bind address for the Express listener. In production start.sh sets this
  // to 127.0.0.1 so the API is only reachable from the Next.js process in
  // the same container.
  HOST: z.string().default("0.0.0.0"),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
