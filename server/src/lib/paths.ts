import { resolve } from "node:path";

// Where the API reads its read-only runtime data files. In dev and in tests
// the process starts from the repo root, so data/ sits next to package.json.
// In the Render image start.sh cd's into /app/api, which also has data/
// alongside server/dist. In both cases cwd + "data" is correct.
//
// A deployer can override with SILA_DATA_ROOT if the image layout changes.
const DATA_ROOT = process.env.SILA_DATA_ROOT ?? resolve(process.cwd(), "data");

export function dataPath(...parts: string[]): string {
  return resolve(DATA_ROOT, ...parts);
}
