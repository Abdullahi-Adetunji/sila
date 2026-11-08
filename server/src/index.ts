import { env } from "./env";
import { createApp } from "./app";

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
