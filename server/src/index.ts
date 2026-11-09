import { env } from "./env";
import { createApp } from "./app";
import { installLogRedactor } from "./lib/log-redact";

// In production, wrap console.* with the redactor BEFORE any other code
// gets to print.
if (env.NODE_ENV === "production") {
  installLogRedactor();
}

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
