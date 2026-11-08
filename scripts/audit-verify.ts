import { verifyAuditChain } from "../server/src/lib/audit";
import { pool } from "../server/src/db/client";

async function main() {
  const result = await verifyAuditChain();
  await pool.end();
  if (result.ok) {
    console.log(`audit chain OK (${result.checked} entries)`);
    process.exit(0);
  }
  console.error(`audit chain BROKEN at seq ${result.brokenAt}: ${result.reason}`);
  process.exit(1);
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
