// Bootstrap the first admin account. Run from a trusted shell:
//
//   npm run admin:create -- --email alice@example.com --name "Alice X"
//
// Prints a one-time setup URL to stdout. The admin opens the URL in a
// browser, sets their password and enrols TOTP. No email is sent — the
// person who ran this script passes the URL on out-of-band.
//
// There is no default admin and no admin credential in env. All
// subsequent admins are created through the /admin dashboard by an
// existing admin. This script only creates invites for the `admin` role.

import { createInvite } from "../server/src/services/invite";
import { db } from "../server/src/db/client";
import { users } from "../server/src/db/schema";
import { sql, eq } from "drizzle-orm";

interface Args {
  email: string;
  name: string;
  baseUrl?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") args.email = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--base-url") args.baseUrl = argv[++i];
    else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    }
  }
  if (!args.email || !args.name) {
    printHelp();
    process.exit(1);
  }
  return { email: args.email!, name: args.name!, baseUrl: args.baseUrl };
}

function printHelp(): void {
  process.stderr.write(
    [
      "",
      "  npm run admin:create -- --email <email> --name <display name>",
      "                         [--base-url https://your-site.example.org]",
      "",
      "Creates an admin invite. Prints the one-time setup URL to stdout.",
      "No email is sent. Pass the URL to the admin out-of-band.",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Refuse if an admin with this email already exists and is active. We
  // allow re-invite if they are deactivated or don't yet exist.
  const existing = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${args.email})`);
  if (existing.length > 0) {
    const row = existing[0];
    if (row.role === "admin" && row.status === "active") {
      process.stderr.write(
        `\nError: an active admin already exists for ${args.email}.\n` +
          `       Ask them to use the /admin dashboard to invite new admins,\n` +
          `       or deactivate the old account first.\n\n`,
      );
      process.exit(2);
    }
    if (row.role !== "admin" && row.role !== "person") {
      process.stderr.write(
        `\nError: ${args.email} already exists as a ${row.role} account.\n` +
          `       Use the /admin dashboard to manage existing staff accounts.\n\n`,
      );
      process.exit(2);
    }
    if (row.role === "person") {
      process.stderr.write(
        `\nError: ${args.email} is already registered as a person account.\n` +
          `       Pick a different email for the admin invite, or ask the\n` +
          `       person to delete their account first.\n\n`,
      );
      process.exit(2);
    }
  }

  // No existing admin can have created this one (there is no admin yet),
  // so attribute the invite to a system placeholder: the first admin
  // account you just created. We bootstrap with a seed user whose role is
  // already admin and whose status is deactivated — the invite then
  // promotes that placeholder on claim. Alternative: just attribute to
  // the first existing admin if any.
  let creatorId: string;
  const anyAdmin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  if (anyAdmin.length > 0) {
    creatorId = anyAdmin[0].id;
  } else {
    // Create the placeholder deactivated admin row; the claim flow will
    // upgrade it in place when the operator opens the invite URL.
    const [placeholder] = await db
      .insert(users)
      .values({
        email: args.email,
        passwordHash: "pending-claim",
        role: "admin",
        status: "deactivated",
      })
      .returning({ id: users.id });
    creatorId = placeholder.id;
  }

  const invite = await createInvite({
    createdBy: creatorId,
    role: "admin",
    email: args.email,
    displayName: args.name,
  });

  const base =
    args.baseUrl ??
    process.env.SILA_PUBLIC_BASE_URL ??
    "https://sila-a7fx.onrender.com";
  const url = `${base.replace(/\/$/, "")}/invite/${invite.code}`;

  process.stdout.write(
    [
      "",
      "Admin invite created.",
      "",
      `  Role:       admin`,
      `  Email:      ${args.email}`,
      `  Name:       ${args.name}`,
      `  Expires at: ${invite.expiresAt.toISOString()}`,
      "",
      "One-time setup URL (share this out-of-band; it's shown once):",
      "",
      `  ${url}`,
      "",
    ].join("\n"),
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`admin-create: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
