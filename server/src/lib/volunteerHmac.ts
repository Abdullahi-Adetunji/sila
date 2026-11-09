import { createHmac } from "node:crypto";
import { env } from "../env";

// HMAC of a participant code using VOLUNTEER_HMAC_KEY. Used as the primary
// key for the volunteer row so the raw code is never written to the
// database or to the audit log. The volunteer holds the code on their own
// device; the server only ever sees it on an inbound header and HMACs it
// before looking it up.
//
// The key is dedicated to the volunteer domain (separate from
// SESSION_SECRET) so rotating one does not invalidate the other.
export function volunteerHmac(code: string): string {
  return createHmac("sha256", env.VOLUNTEER_HMAC_KEY).update(`volunteer:${code}`).digest("base64url");
}
