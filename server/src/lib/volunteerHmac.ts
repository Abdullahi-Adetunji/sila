import { createHmac } from "node:crypto";
import { env } from "../env";

// HMAC of a participant code using SESSION_SECRET as the key. Used as the
// primary key for the volunteer row so the raw code is never written to the
// database or to the audit log. The volunteer holds the code on their own
// device; the server only ever sees it on an inbound header and HMACs it
// before looking it up.
//
// We prefix with "volunteer:" to domain-separate from any other HMAC that
// may later use the same secret.
export function volunteerHmac(code: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`volunteer:${code}`).digest("base64url");
}
