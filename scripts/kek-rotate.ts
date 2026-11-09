// Rewrap every vault_keys row under a new KEK. The rotation increments
// key_version so the AAD binds to the new version.
//
// Usage:
//   SILA_KEK=<old base64url> SILA_KEK_NEXT=<new base64url> npm run kek:rotate
//
// After a successful run, restart the API with SILA_KEK set to the new value.

import { pool } from "../server/src/db/client";
import { rotateKek } from "../server/src/lib/kekRotate";

async function main() {
  const oldKek = process.env.SILA_KEK;
  const newKek = process.env.SILA_KEK_NEXT;
  if (!oldKek) {
    console.error("SILA_KEK (the current KEK) is not set.");
    process.exit(1);
  }
  if (!newKek) {
    console.error("SILA_KEK_NEXT (the new KEK) is not set.");
    process.exit(1);
  }
  if (oldKek === newKek) {
    console.error("SILA_KEK and SILA_KEK_NEXT are identical; nothing to rotate.");
    process.exit(1);
  }
  const result = await rotateKek(oldKek, newKek);
  await pool.end();
  console.log(
    `kek-rotate: rotated=${result.rotated} skipped=${result.skipped} new_version=${result.newVersion}`,
  );
  console.log("Restart the API with SILA_KEK set to the new value.");
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
