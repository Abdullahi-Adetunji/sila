import { describe, expect, it } from "vitest";
import { __internal } from "../db/client";

// Neon's free compute suspends after ~5 minutes idle and takes a few
// seconds to wake. The first query after wake will error with one of the
// codes below; everything else must flow through unchanged. These
// classification tests are the safety net against accidentally swallowing a
// real error as "the database is just waking up".

describe("isWakeError classification", () => {
  it.each([
    ["57P01", "admin_shutdown"],
    ["57P02", "crash_shutdown"],
    ["57P03", "cannot_connect_now"],
    ["08006", "connection_failure"],
    ["08003", "connection_does_not_exist"],
    ["08001", "sqlclient_unable_to_establish_sqlconnection"],
    ["ECONNRESET", "socket reset"],
    ["ETIMEDOUT", "socket timeout"],
    ["ENOTFOUND", "dns lookup failed"],
  ])("treats %s (%s) as a wake error", (code) => {
    expect(__internal.isWakeError({ code })).toBe(true);
  });

  it("matches 'Connection terminated' in an error message without a code", () => {
    expect(__internal.isWakeError({ message: "Connection terminated unexpectedly" })).toBe(true);
    expect(__internal.isWakeError({ message: "server closed the connection unexpectedly" })).toBe(
      true,
    );
  });

  it("does not misclassify application errors", () => {
    expect(__internal.isWakeError({ code: "23505", message: "unique violation" })).toBe(false);
    expect(__internal.isWakeError({ code: "42601", message: "syntax error" })).toBe(false);
    expect(__internal.isWakeError({ code: "42501", message: "insufficient privilege" })).toBe(
      false,
    );
    expect(__internal.isWakeError(new Error("permission denied for relation audit_log"))).toBe(
      false,
    );
    expect(__internal.isWakeError(null)).toBe(false);
    expect(__internal.isWakeError(undefined)).toBe(false);
    expect(__internal.isWakeError("just a string")).toBe(false);
  });
});
