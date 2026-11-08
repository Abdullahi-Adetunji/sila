import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SILA_KEK: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
