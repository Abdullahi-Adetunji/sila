import { env } from "./env";
import { createApp } from "./app";
import { installLogRedactor } from "./lib/log-redact";
import { preflightProductionDbRole } from "./lib/preflight";

// In production, wrap console.* with the redactor BEFORE any other code
// gets to print.
if (env.NODE_ENV === "production") {
  installLogRedactor();
}

async function main(): Promise<void> {
  if (env.NODE_ENV === "production") {
    await preflightProductionDbRole();
  }
  const app = createApp();
  app.listen(env.PORT, env.HOST, () => {
    console.log(`API listening on ${env.HOST}:${env.PORT}`);
  });
}

main().catch((e) => {
  console.error("[startup] failed:", e);
  process.exit(1);
});
