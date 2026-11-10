import express, { type Express, type Router } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { pool } from "./db/client";
import authRouter from "./routes/auth";
import inviteRouter from "./routes/invite";
import meRouter from "./routes/me";
import partnerRouter from "./routes/partner";
import consentRouter from "./routes/consent";
import coupleRouter from "./routes/couple";
import auditRouter from "./routes/audit";
import counsellorRouter from "./routes/counsellor";
import demoRouter from "./routes/demo";
import devRouter from "./routes/dev";
import relativesRouter from "./routes/relatives";
import referralsRouter from "./routes/referrals";
import volunteerRouter from "./routes/volunteer";
import evaluatorRouter from "./routes/evaluator";

export const MOUNTS: ReadonlyArray<{ prefix: string; router: Router }> = [
  { prefix: "/api/auth", router: authRouter },
  { prefix: "/api/invite", router: inviteRouter },
  { prefix: "/api/me", router: meRouter },
  { prefix: "/api/partner", router: partnerRouter },
  { prefix: "/api/consent", router: consentRouter },
  { prefix: "/api/couple", router: coupleRouter },
  { prefix: "/api/me", router: auditRouter },
  { prefix: "/api/counsellor", router: counsellorRouter },
  { prefix: "/api/demo", router: demoRouter },
  { prefix: "/api/dev", router: devRouter },
  { prefix: "/api/relatives", router: relativesRouter },
  { prefix: "/api/referrals", router: referralsRouter },
  { prefix: "/api/volunteer", router: volunteerRouter },
  { prefix: "/api/evaluator", router: evaluatorRouter },
];

export function createApp(): Express {
  const app = express();
  // Hops in front of Express in production:
  //   1. Cloudflare (Render's free tier is fronted by Cloudflare — a request
  //      has `server: cloudflare` and a `cf-ray` header).
  //   2. Render's internal edge proxy (adds X-Forwarded-For).
  //   3. Next.js running in the same container (rewrites /api/* to localhost).
  // Setting the exact number means req.ip is the real client IP from XFF,
  // not 127.0.0.1 and not a floating Cloudflare edge address (either of
  // which would fragment the rate-limit buckets per request and defeat the
  // "20 bad logins per 15 min" cap). Keep this in sync with the deployment
  // topology; the rateLimit test asserts the exact number.
  app.set("trust proxy", 3);

  // Hardened security headers. CSP for the API responses is strict by default
  // because the API only ever returns JSON. The Next.js app sets its own
  // page-level CSP (see next.config.ts).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 60 * 60 * 24 * 365,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "no-referrer" },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use((_req, res, next) => {
    // Permissions-Policy is not in helmet's defaults.
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), accelerometer=(), gyroscope=()",
    );
    next();
  });

  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  // Liveness: no DB. Render's health check and any external uptime monitor
  // ping this. Keeping it DB-free matters because Neon's free compute
  // auto-suspends after ~5 minutes of inactivity; if the liveness check
  // touched the database, every ping would wake Neon and the compute would
  // never sleep. start.sh also polls the loopback /healthz while deciding
  // whether to start Next.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get("/api/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  // Readiness: touches the DB with "select 1". Use this from the
  // verification scripts after a deploy, not from Render's health check and
  // not from an uptime monitor — doing so would prevent Neon from
  // suspending and defeat the point of the free tier.
  app.get("/api/ready", async (_req, res) => {
    try {
      await pool.query("select 1");
      res.status(200).json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  });
  for (const m of MOUNTS) {
    app.use(m.prefix, m.router);
  }
  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  // Central error handler. In production the response is a short string with
  // no stack trace. Server-side we still log the full error.
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "internal error" });
        return;
      }
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: "internal error", message });
    },
  );
  return app;
}
